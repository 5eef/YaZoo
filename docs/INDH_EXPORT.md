# Export INDH sûr

L’export inclut uniquement les fichiers source suivis par Git, la documentation
publique et les ressources nécessaires à l’analyse. Il exclut notamment les
fichiers `.env` réels, dépendances, caches, journaux, couvertures, bases, dumps,
sauvegardes, anciennes archives et médias ou documents privés.

Depuis la racine du dépôt, exécuter :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-indh.ps1
```

L’archive est créée dans `exports\indh\yazoo-indh-source.zip`. Le script refuse
d’écraser une archive existante. Choisir explicitement un autre nom pour un
nouvel export :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-indh.ps1 `
  -ArchiveName "yazoo-indh-source-2026-07-30.zip"
```

Chaque archive contient `INDH_EXPORT_MANIFEST.txt`. Après création, le script
inspecte les noms de toutes les entrées et supprime l’archive si un chemin
interdit est détecté.

Test automatique :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-export-indh.ps1
```
