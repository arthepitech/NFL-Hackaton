# 🚀 Guide de Déploiement Cloud (Render & Vercel)

Ce guide détaille pas à pas comment déployer **Trench Lab** en production avec :
- **Backend (API FastAPI)** hébergé sur **Render**
- **Frontend (React / Vite)** hébergé sur **Vercel**
- **Données privées protégées** : les données sous licence (BDB / PFF) restent exclues de GitHub grâce à un hébergement séparé et sécurisé de l'archive Parquet précalculée (`data/processed`).

---

## 📦 Étape 1 : Préparer et héberger l'archive des données précalculées

Comme le dépôt GitHub est public et que les données NFL / PFF ne doivent pas être commitées, l'API sur Render télécharge l'archive Parquet précalculée (`data/processed`, environ 127 Mo) lors de son étape de *Build*.

### 1.1 Générer l'archive localement
Depuis votre terminal local, lancez :
```bash
python scripts/package_data.py
```
Cela produit un fichier `data_processed.zip` à la racine (automatiquement ignoré par `.gitignore`).

### 1.2 Uploader `data_processed.zip` sur un stockage cloud
Uploadez ce fichier sur le service cloud de votre choix pour obtenir un lien de téléchargement direct :
- **Supabase Storage (Recommandé, 100 % gratuit)** :
  1. Créez un projet sur [supabase.com](https://supabase.com).
  2. Allez dans *Storage* > *New bucket* > Nommez-le `data` et cochez **Public Bucket**.
  3. Uploadez `data_processed.zip`.
  4. Cliquez sur les 3 points du fichier > **Get public URL**.
- **Cloudflare R2 / AWS S3** :
  - Uploadez le zip dans un bucket public ou générez une URL pré-signée longue durée.
- **Google Drive** :
  - Uploadez `data_processed.zip`, passez le partage en « Tous les utilisateurs disposant du lien ».
  - Utilisez le lien de partage (le script `scripts/download_data.py` convertit automatiquement le lien Google Drive).
- **Dropbox** :
  - Obtenez un lien de partage et assurez-vous qu'il se termine par `?dl=1`.

---

## ⚙️ Étape 2 : Déployer le Backend sur Render

1. Connectez-vous sur [dashboard.render.com](https://dashboard.render.com).
2. Cliquez sur **New +** > **Web Service**.
3. Liez votre dépôt GitHub public `NFL-Hackaton`.
4. Renseignez la configuration :
   - **Name** : `trenchlab-api` (ou le nom de votre choix)
   - **Region** : Frankfurt (ou la région la plus proche de vous)
   - **Language** : `Python`
   - **Branch** : `main` (ou votre branche active)
   - **Build Command** :
     ```bash
     pip install -e . && python scripts/download_data.py
     ```
   - **Start Command** :
     ```bash
     uvicorn api.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type** : `Free`
5. Ajoutez les **Environment Variables** :
   - `PYTHON_VERSION` = `3.12.7`
   - `DATA_PROCESSED_URL` = `<votre_lien_direct_vers_data_processed.zip>`
   - `CORS_ORIGIN_REGEX` = `https://.*\.vercel\.app`
6. Cliquez sur **Deploy Web Service**.
7. Une fois le déploiement terminé, copiez l'URL fournie par Render (ex: `https://trenchlab-api.onrender.com`).
   Vous pouvez tester que tout fonctionne en ouvrant `https://trenchlab-api.onrender.com/health` (qui doit répondre `{"status":"ok"}`).

---

## 🎨 Étape 3 : Déployer le Frontend sur Vercel

1. Connectez-vous sur [vercel.com](https://vercel.com).
2. Cliquez sur **Add New...** > **Project**.
3. Importez votre dépôt GitHub `NFL-Hackaton`.
4. Dans l'écran de configuration du projet :
   - **Framework Preset** : `Vite`
   - **Root Directory** : Cliquez sur *Edit* et sélectionnez le dossier `ui` (ou laissez la racine, le fichier `vercel.json` est prêt pour les deux cas).
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
5. Déroulez la section **Environment Variables** et ajoutez :
   - **Nom** : `VITE_API_URL`
   - **Valeur** : `https://trenchlab-api.onrender.com` *(l'URL Render obtenue à l'Étape 2, sans slash à la fin)*
6. Cliquez sur **Deploy**.

---

## ✅ Étape 4 : Vérification Finale

1. Ouvrez votre application Vercel (`https://<votre-projet>.vercel.app`).
2. Vérifiez que la Scout Card, les listes de jeux et les visualisations chargent instantanément.
3. En cas de mise en veille du plan gratuit de Render (après 15 min d'inactivité), la première requête peut prendre environ 30 à 45 secondes pour réveiller le serveur.
