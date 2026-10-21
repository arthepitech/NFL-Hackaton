"""Compresse le dossier data/processed en archive zip prête à être hébergée.

Usage :
    python scripts/package_data.py
    python scripts/package_data.py --output mon_chemin/data_processed.zip
"""

from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"
DEFAULT_OUTPUT = ROOT / "data_processed.zip"


def main() -> int:
    parser = argparse.ArgumentParser(description="Package data/processed into zip for cloud deployment")
    parser.add_argument("--output", "-o", default=DEFAULT_OUTPUT, type=Path, help="Fichier de sortie zip")
    args = parser.parse_args()

    if not PROCESSED_DIR.exists():
        print(f"[ERREUR] Le dossier {PROCESSED_DIR} n'existe pas. Lancez d'abord l'ETL (make etl).", file=sys.stderr)
        return 1

    marker = PROCESSED_DIR / "snaps_ol.parquet"
    if not marker.exists():
        print(f"[ERREUR] Le fichier {marker} est manquant. Lancez d'abord l'ETL (make etl).", file=sys.stderr)
        return 1

    files_to_pack = [p for p in PROCESSED_DIR.rglob("*") if p.is_file()]
    print(f"[Trench Lab] Compression de {len(files_to_pack)} fichiers depuis {PROCESSED_DIR}...")

    output_path: Path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for idx, file_path in enumerate(files_to_pack, 1):
            rel_path = file_path.relative_to(PROCESSED_DIR)
            z.write(file_path, arcname=str(rel_path))
            if idx % 15 == 0 or idx == len(files_to_pack):
                sys.stdout.write(f"\rProgression : {idx}/{len(files_to_pack)} fichiers ajoutés...")
                sys.stdout.flush()

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"\n[Trench Lab] ✅ Archive créée avec succès : {output_path} ({size_mb:.1f} Mo)")
    print("\n" + "=" * 70)
    print("PROCHAINES ÉTAPES POUR LE DÉPLOIEMENT :")
    print("1. Téléversez 'data_processed.zip' sur un hébergeur cloud de votre choix :")
    print("   • Supabase Storage (Gratuit jusqu'à 1 Go, idéal, URL publique directe en 1 clic)")
    print("   • Cloudflare R2 ou AWS S3 (Bucket public ou lien pré-signé)")
    print("   • Google Drive (Lien partagé avec accès public)")
    print("   • Dropbox (Lien avec ?dl=1)")
    print("2. Copiez le lien de téléchargement direct obtenu.")
    print("3. Dans votre dashboard Render (Web Service > Environment) :")
    print("   Ajoutez la variable : DATA_PROCESSED_URL = <votre_lien_direct>")
    print("=" * 70)

    return 0


if __name__ == "__main__":
    sys.exit(main())
