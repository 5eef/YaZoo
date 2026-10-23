# Médias AFWAJ fictifs

Deux animations synthétiques originales, sans personne ni partenaire réel.
MP4 H.264 baseline, yuv420p, 240 × 426, 12 images/s, 4 secondes, sans audio,
environ 80 Ko chacune. Le texte « YaZoo DEMO » est intégré aux pixels.
Les deux clips illustrent le lecteur vidéo ; ils ne prétendent pas documenter des soins.

Générés avec FFmpeg 8.1.2 et DejaVu Sans 2.37 :

```sh
for number in 1 2; do
  ffmpeg -f lavfi -i 'testsrc2=s=240x426:r=12:d=4' \
    -vf "drawgrid=w=60:h=60:t=1:c=white@0.3,drawbox=x=40:y=160:w=160:h=100:c=0xa855f7:t=fill,drawtext=text='YaZoo DEMO ${number}':fontcolor=white:fontsize=22:x=(w-tw)/2:y=190" \
    -an -c:v libx264 -profile:v baseline -pix_fmt yuv420p -crf 30 \
    -movflags +faststart -map_metadata -1 -fflags +bitexact -flags:v +bitexact \
    -y "afwaj-reel-${number}.mp4"
done
```

Les binaires versionnés sont la source canonique. Aucun FFmpeg ni accès réseau
n'est nécessaire au runtime. `Dockerfile.api-demo` copie déjà ce dossier avec
`backend/`. `yazoo:ensure-showcase-media` restaure les fichiers dans le stockage
public éphémère après chaque redémarrage, sans toucher aux lignes de la base.
