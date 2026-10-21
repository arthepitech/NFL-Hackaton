"""Télécharge et extrait automatiquement les fichiers Parquet précalculés (data/processed).

Utilisé par Render au moment du Build pour récupérer les données sans les stocker sur GitHub.
URL source configurable via la variable d'environnement DATA_PROCESSED_URL.
"""

from __future__ import annotations

import os
import shutil
import sys
import tarfile
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"
MARKER_FILE = PROCESSED_DIR / "snaps_ol.parquet"


def is_already_installed() -> bool:
    return MARKER_FILE.exists() and MARKER_FILE.stat().st_size > 0


def format_url(url: str) -> str:
    """Normalise certains formats d'URL courants (Dropbox, Google Drive)."""
    # Dropbox : forcer dl=1 pour un téléchargement direct
    if "dropbox.com" in url and "dl=0" in url:
        return url.replace("dl=0", "dl=1")

    # Google Drive : convertir les liens de partage en liens directs
    if "drive.google.com" in url:
        if "/file/d/" in url:
            file_id = url.split("/file/d/")[1].split("/")[0].split("?")[0]
            return f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"
        elif "id=" in url and "export=download" not in url:
            parsed = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
            if "id" in parsed:
                return f"https://drive.usercontent.google.com/download?id={parsed['id'][0]}&export=download&confirm=t"

    return url


def download_file(url: str, dest: Path) -> None:
    print(f"[Trench Lab] Téléchargement depuis : {url}")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (TrenchLab-DataDownloader)"},
    )
    with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
        total = resp.getheader("Content-Length")
        total_bytes = int(total) if total and total.isdigit() else 0
        downloaded = 0
        chunk_size = 1024 * 1024  # 1 Mo

        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            if total_bytes > 0:
                pct = (downloaded / total_bytes) * 100
                sys.stdout.write(f"\r[Trench Lab] {downloaded / (1024*1024):.1f} / {total_bytes / (1024*1024):.1f} Mo ({pct:.1f}%)")
            else:
                sys.stdout.write(f"\r[Trench Lab] {downloaded / (1024*1024):.1f} Mo téléchargés")
            sys.stdout.flush()
        print("\n[Trench Lab] Téléchargement terminé avec succès.")


def extract_archive(archive_path: Path, target_dir: Path) -> None:
    print(f"[Trench Lab] Extraction vers : {target_dir}")
    target_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp_extract:
        tmp_dir = Path(tmp_extract)
        if zipfile.is_zipfile(archive_path):
            with zipfile.ZipFile(archive_path, "r") as z:
                z.extractall(tmp_dir)
        elif tarfile.is_tarfile(archive_path):
            with tarfile.open(archive_path, "r:*") as t:
                t.extractall(tmp_dir)
        else:
            raise ValueError(f"Format d'archive non supporté ou fichier corrompu : {archive_path}")

        # Si l'archive contenait un sous-dossier unique 'processed' ou 'data/processed'
        candidate_snaps = list(tmp_dir.glob("**/snaps_ol.parquet"))
        if not candidate_snaps:
            raise FileNotFoundError("snaps_ol.parquet introuvable dans l'archive téléchargée.")

        source_root = candidate_snaps[0].parent
        for item in source_root.iterdir():
            dest = target_dir / item.name
            if dest.exists():
                if dest.is_dir():
                    shutil.rmtree(dest)
                else:
                    dest.unlink()
            shutil.move(str(item), str(target_dir))


def main() -> int:
    if is_already_installed():
        print(f"[Trench Lab] Données déjà présentes dans {PROCESSED_DIR}. Rien à faire.")
        return 0

    url = os.environ.get("DATA_PROCESSED_URL") or os.environ.get("DATA_URL")
    if not url:
        print("=" * 70)
        print("[Trench Lab] ⚠️  ATTENTION : data/processed/ est absent !")
        print("Pour que le backend sur Render puisse démarrer, il a besoin des fichiers Parquet.")
        print()
        print("Étapes à suivre :")
        print("1. Exécutez localement : python scripts/package_data.py")
        print("2. Uploadez le fichier data_processed.zip produit sur un stockage cloud")
        print("   (ex: Supabase Storage, Google Drive, AWS S3, Cloudflare R2, Dropbox).")
        print("3. Ajoutez la variable d'environnement sur Render :")
        print("   DATA_PROCESSED_URL = <lien_direct_vers_votre_archive>")
        print("=" * 70)
        # On ne bloque pas le build si c'est un environnement de test local,
        # mais sur Render (avec RENDER=true), on avertit clairement
        if os.environ.get("RENDER") == "true":
            print("[Trench Lab] Erreur : DATA_PROCESSED_URL manquante sur Render.")
            return 1
        return 0

    url = format_url(url.strip())
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(suffix=".archive", delete=False) as tmp_file:
        tmp_path = Path(tmp_file.name)

    try:
        download_file(url, tmp_path)
        extract_archive(tmp_path, PROCESSED_DIR)
        if not is_already_installed():
            print(f"[Trench Lab] Erreur : {MARKER_FILE} est manquant après extraction.")
            return 1
        print("[Trench Lab] ✅ Données prêtes pour le démarrage de l'API.")
        return 0
    except Exception as e:
        print(f"[Trench Lab] ❌ Échec de la récupération des données : {e}")
        return 1
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


if __name__ == "__main__":
    sys.exit(main())
