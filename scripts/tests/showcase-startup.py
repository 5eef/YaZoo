"""Disposable showcase startup checks; no remote database or credentials used."""
import json
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

IMAGE = sys.argv[1]

def docker(*args, check=True):
    return subprocess.run(["docker", *args], check=check, capture_output=True, text=True).stdout.strip()


def inspect(name):
    return json.loads(docker("inspect", name))[0]


def request(port, endpoint, method="GET"):
    try:
        with urllib.request.urlopen(urllib.request.Request(
            f"http://127.0.0.1:{port}{endpoint}", method=method), timeout=2) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except (OSError, TimeoutError):
        return None, b""


def logs_ok(name):
    result = subprocess.run(["docker", "logs", name], capture_output=True, text=True, check=True)
    logs = result.stdout + result.stderr
    assert "connect() failed (111: Connection refused)" not in logs, logs
    return logs


containers = []
try:
    with tempfile.TemporaryDirectory(prefix="yazoo-fpm-") as directory:
        for mode in ("normal", "invalid", "timeout"):
            name = "yazoo-fpm-test-" + uuid.uuid4().hex[:10]
            args = ["run", "-d", "--name", name, "-p", "127.0.0.1::8080"]
            for setting in ("APP_ENV=testing", "APP_DEBUG=false",
                            "APP_KEY=base64:c49vk2fjl1WJZPUaxanThGkmCDU9hHDldPjseMgdaQc=",
                            "DB_CONNECTION=sqlite", "DB_DATABASE=/tmp/startup-test.sqlite",
                            "CACHE_STORE=array", "SESSION_DRIVER=file", "QUEUE_CONNECTION=sync",
                            "BROADCAST_CONNECTION=log", "MAIL_MAILER=array",
                            "MEDIA_STORAGE_DRIVER=filesystem", "YAZOO_RUNTIME_OPTIMIZE=true"):
                args += ["-e", setting]
            if mode != "normal":
                config = pathlib.Path(directory) / "zz-test.conf"
                config.write_text("[www]\n" + ("invalid_directive = true\n" if mode == "invalid"
                                                  else "listen = 127.0.0.1:9001\n"))
                args += ["--mount", f"type=bind,src={config},dst=/usr/local/etc/php-fpm.d/zz-test.conf,readonly"]
            args += [IMAGE, "sh", "-c",
                     "touch /tmp/startup-test.sqlite; php artisan migrate --force --no-interaction && exec yazoo-startup"]
            docker(*args)
            containers.append(name)
            if mode != "normal":
                started = time.monotonic()
                while inspect(name)["State"]["Running"] and time.monotonic() - started < 30:
                    time.sleep(0.2)
                state = inspect(name)["State"]
                assert not state["Running"] and state["ExitCode"] not in (0, 137), state
                logs = logs_ok(name)
                assert "Started nginx" not in logs, logs
                assert ("readiness timed out" if mode == "timeout" else "exited unexpectedly") in logs, logs
                print(f"real-fpm {mode}=ok exit={state['ExitCode']}", flush=True)
                continue
            port = inspect(name)["NetworkSettings"]["Ports"]["8080/tcp"][0]["HostPort"]
            for cycle in range(4):
                deadline = time.monotonic() + 45
                while time.monotonic() < deadline:
                    status, _ = request(port, "/", "HEAD")
                    assert status != 502, "Startup returned FastCGI 502"
                    ready, body = request(port, "/health/ready")
                    if ready == 200:
                        assert json.loads(body)["checks"]["database"]["ok"]
                        break
                    assert inspect(name)["State"]["Running"], logs_ok(name)
                    time.sleep(0.1)
                else:
                    raise AssertionError(logs_ok(name))
                assert request(port, "/", "HEAD")[0] == 200
                assert request(port, "/health/live")[0] == 200
                docker("exec", name, "php", "-r",
                       '$s=fsockopen("127.0.0.1",9000); if (!$s) exit(1); fclose($s);')
                logs = logs_ok(name)
                assert logs.rindex("PHP-FPM is ready") < logs.rindex("Started nginx"), logs
                processes = docker("top", name, "-eo", "user,pid,comm")
                assert not any(line.split()[0] == "root" for line in processes.splitlines()[1:]), processes
                print(f"showcase startup cycle={cycle + 1} HEAD/live/ready/non-root=ok", flush=True)
                docker("stop", "-t", "10", name)
                assert inspect(name)["State"]["ExitCode"] == 143, inspect(name)["State"]
                if cycle < 3:
                    docker("start", name)
                    port = inspect(name)["NetworkSettings"]["Ports"]["8080/tcp"][0]["HostPort"]
finally:
    for name in containers:
        docker("rm", "-f", name, check=False)
