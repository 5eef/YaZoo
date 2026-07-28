# Frontend YaZoo

Application React/Vite reliee a l'API Laravel YaZoo.

Prerequis: Node.js 22.22 ou ulterieur (React Router 8.3.0).

## Installation

```powershell
npm install
```

## Lancement

```powershell
npm run dev
```

## Verification

```powershell
npm run lint
npm run build
```

## Variables d'environnement

Voir [`.env.example`](./.env.example):

- `VITE_API_URL`: URL de l'API Laravel
- `VITE_STORAGE_URL`: URL publique de stockage
- `VITE_NOTIFICATIONS_POLL_MS`: frequence de rafraichissement des notifications

## Direction UI

- theme clair uniquement
- violet degrade doux
- cartes lumineuses et ombres legeres
- experience mobile et desktop coherente

## Pages principales

- Landing, Login, Register
- Feed et creation de posts
- Marketplace animaux et produits
- Details annonce et reservation
- Reservations, historique, facture
- Communautes, messages, notifications
- Admin moderation et commandes
