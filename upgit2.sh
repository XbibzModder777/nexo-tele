#!/bin/bash

# ==================================================
# OTOMATISASI GITHUB DENGAN FITUR PENYIMPANAN TOKEN
# Versi 5.2 - Edisi Enterprise (Dengan Manajemen User)
# ==================================================

# Konfigurasi Warna
MERAH='\033[0;31m'
HIJAU='\033[0;32m'
KUNING='\033[1;33m'
BIRU='\033[0;34m'
UNGU='\033[0;35m'
CYAN='\033[0;36m'
PUTIH='\033[1;37m'
NC='\033[0m' # No Color

# Konfigurasi Path
CONFIG_DIR="$HOME/.config/github-auto-upload"
TOKEN_FILE="$CONFIG_DIR/token"
CONFIG_FILE="$CONFIG_DIR/config"
USER_FILE="$CONFIG_DIR/userinfo"

# Variabel Informasi Sistem
INFO_SISTEM=""
INFO_CPU=""
INFO_GPU=""
INFO_ARSITEKTUR=""
INFO_BATERAI=""
INFO_IP=""
INFO_JAM=""
INFO_TANGGAL=""

# Fungsi untuk membuat direktori konfigurasi
setup_konfigurasi() {
    if [ ! -d "$CONFIG_DIR" ]; then
        mkdir -p "$CONFIG_DIR"
        chmod 700 "$CONFIG_DIR"
        echo -e "${HIJAU}Direktori konfigurasi dibuat: $CONFIG_DIR${NC}"
    fi
}

# Fungsi untuk menyimpan informasi user
simpan_info_user() {
    local email=$1
    local nama=$2
    echo "EMAIL=$email" > "$USER_FILE"
    echo "NAMA=$nama" >> "$USER_FILE"
    chmod 600 "$USER_FILE"
    echo -e "${HIJAU}Informasi user berhasil disimpan!${NC}"
}

# Fungsi untuk membaca informasi user
baca_info_user() {
    if [ -f "$USER_FILE" ]; then
        source "$USER_FILE"
        echo "$EMAIL|$NAMA"
    else
        echo "||"
    fi
}

# Fungsi untuk menyimpan token
simpan_token() {
    local token=$1
    echo "$token" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
    echo -e "${HIJAU}Token berhasil disimpan secara aman${NC}"
}

# Fungsi untuk membaca token
baca_token() {
    if [ -f "$TOKEN_FILE" ]; then
        cat "$TOKEN_FILE"
    else
        echo ""
    fi
}

# Fungsi untuk validasi token GitHub
validasi_token() {
    local token=$1
    if [ -z "$token" ]; then
        return 1
    fi
    
    # Gunakan curl dengan timeout untuk menghindari hanging
    local response=$(curl -s -m 10 -H "Authorization: token $token" https://api.github.com/user 2>/dev/null)
    if echo "$response" | grep -q "login"; then
        return 0
    else
        return 1
    fi
}

# Fungsi untuk mendapatkan informasi sistem
dapatkan_info_sistem() {
    echo -e "${CYAN}Mendapatkan informasi sistem...${NC}"
    
    # Informasi CPU
    if command -v lscpu &> /dev/null; then
        INFO_CPU=$(lscpu | grep "Model name" | cut -d':' -f2 | sed 's/^ *//' | head -n1)
    elif [ -f "/proc/cpuinfo" ]; then
        INFO_CPU=$(grep -m1 "model name" /proc/cpuinfo | cut -d':' -f2 | sed 's/^ *//')
    else
        INFO_CPU="Tidak diketahui"
    fi

    # Informasi GPU
    if command -v lspci &> /dev/null; then
        INFO_GPU=$(lspci | grep -i "vga\|3d\|display" | head -n1 | cut -d':' -f3 | sed 's/^ *//')
    elif command -v nvidia-smi &> /dev/null; then
        INFO_GPU=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n1)
    else
        INFO_GPU="Tidak diketahui"
    fi

    # Informasi Arsitektur
    INFO_ARSITEKTUR=$(uname -m)

    # Informasi Baterai
    if [ -d "/sys/class/power_supply" ]; then
        local baterai=$(ls /sys/class/power_supply/ | grep -i BAT | head -n1)
        if [ -n "$baterai" ]; then
            local kapasitas=$(cat /sys/class/power_supply/$baterai/capacity 2>/dev/null)
            if [ -n "$kapasitas" ]; then
                INFO_BATERAI="${kapasitas}%"
            else
                INFO_BATERAI="Tidak tersedia"
            fi
        else
            INFO_BATERAI="Tidak ada baterai"
        fi
    else
        INFO_BATERAI="Tidak tersedia"
    fi

    # Informasi IP
    if command -v ip &> /dev/null; then
        INFO_IP=$(ip addr show 2>/dev/null | grep -w "inet" | grep -v "127.0.0.1" | head -n1 | awk '{print $2}' | cut -d'/' -f1)
    elif command -v ifconfig &> /dev/null; then
        INFO_IP=$(ifconfig 2>/dev/null | grep -w "inet" | grep -v "127.0.0.1" | head -n1 | awk '{print $2}')
    else
        INFO_IP="Tidak diketahui"
    fi

    # Informasi Waktu
    INFO_JAM=$(date +"%H:%M:%S")
    INFO_TANGGAL=$(date +"%d-%m-%Y")

    # Format informasi sistem
    INFO_SISTEM=$(cat <<EOF
${UNGU}╔════════════════════════════════════════════════════════════╗
║                    INFORMASI SISTEM                     ║
╠════════════════════════════════════════════════════════════╣
║ ${CYAN}CPU:${PUTIH} $(printf "%-50s" "${INFO_CPU:0:50}") ${UNGU}║
║ ${CYAN}GPU:${PUTIH} $(printf "%-50s" "${INFO_GPU:0:50}") ${UNGU}║
║ ${CYAN}Arsitektur:${PUTIH} $(printf "%-40s" "$INFO_ARSITEKTUR") ${UNGU}║
║ ${CYAN}Baterai:${PUTIH} $(printf "%-47s" "$INFO_BATERAI") ${UNGU}║
║ ${CYAN}Alamat IP:${PUTIH} $(printf "%-44s" "$INFO_IP") ${UNGU}║
║ ${CYAN}Jam:${PUTIH} $(printf "%-50s" "$INFO_JAM") ${UNGU}║
║ ${CYAN}Tanggal:${PUTIH} $(printf "%-50s" "$INFO_TANGGAL") ${UNGU}║
╚════════════════════════════════════════════════════════════╝${NC}
EOF
)
}

# Fungsi untuk menampilkan header
tampilkan_header() {
    clear
    echo -e "${UNGU}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           OTOMATISASI GITHUB v5.2 - ENTERPRISE           ║"
    echo "║         Dengan Manajemen User dan Penyimpanan Token      ║"
    echo "║                 oleh Asisten AI                         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "$INFO_SISTEM"
}

# Fungsi untuk mengelola informasi user
kelola_info_user() {
    local user_info=$(baca_info_user)
    local saved_email=$(echo "$user_info" | cut -d'|' -f1)
    local saved_name=$(echo "$user_info" | cut -d'|' -f2)
    
    local current_email=$(git config --global user.email)
    local current_name=$(git config --global user.name)
    
    # Gunakan informasi yang disimpan jika ada
    if [ -n "$saved_email" ] && [ -n "$saved_name" ]; then
        current_email="$saved_email"
        current_name="$saved_name"
    fi
    
    echo -e "\n${CYAN}Konfigurasi User GitHub:${NC}"
    echo -e "${HIJAU}Email saat ini: ${PUTIH}${current_email}${NC}"
    echo -e "${HIJAU}Nama saat ini: ${PUTIH}${current_name}${NC}"
    
    read -p "Apakah Anda ingin mengubah informasi user? (y/n): " ubah_user
    if [[ "$ubah_user" == "y" || "$ubah_user" == "Y" ]]; then
        # Minta email baru
        while true; do
            read -p "Masukkan email GitHub Anda (kosongkan untuk tidak mengubah): " new_email
            if [ -z "$new_email" ]; then
                break
            fi
            if [[ "$new_email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
                break
            else
                echo -e "${MERAH}Format email tidak valid!${NC}"
            fi
        done
        
        # Minta nama baru
        read -p "Masukkan nama GitHub Anda (kosongkan untuk tidak mengubah): " new_name
        
        # Update konfigurasi
        if [ -n "$new_email" ]; then
            git config --global user.email "$new_email"
            current_email="$new_email"
            echo -e "${HIJAU}Email berhasil diubah!${NC}"
        fi
        
        if [ -n "$new_name" ]; then
            git config --global user.name "$new_name"
            current_name="$new_name"
            echo -e "${HIJAU}Nama berhasil diubah!${NC}"
        fi
        
        # Simpan informasi user
        simpan_info_user "$current_email" "$current_name"
    else
        # Set konfigurasi dari yang disimpan
        if [ -n "$saved_email" ] && [ -n "$saved_name" ]; then
            git config --global user.email "$saved_email"
            git config --global user.name "$saved_name"
        fi
    fi
    
    echo -e "${HIJAU}Menggunakan email: ${PUTIH}$current_email${NC}"
    echo -e "${HIJAU}Menggunakan nama: ${PUTIH}$current_name${NC}"
}

# Animasi loading
animasi_loading() {
    local pid=$1
    local delay=0.1
    local spinstr='⣾⣽⣻⢿⡿⣟⣯⣷'
    tput civis 2>/dev/null
    while ps -p $pid > /dev/null 2>&1; do
        for i in $(seq 0 7); do
            printf " [${CYAN}%s${NC}]  " "${spinstr:$i:1}"
            sleep $delay
            printf "\b\b\b\b\b\b"
        done
    done
    tput cnorm 2>/dev/null
    printf "    \b\b\b\b"
}

# Fungsi untuk validasi URL GitHub
validasi_url_github() {
    local url=$1
    if [[ $url =~ ^https://github.com/.*/.+\.git$ ]] || [[ $url =~ ^git@github.com:.*/.+\.git$ ]]; then
        return 0
    else
        return 1
    fi
}

# Fungsi untuk menangani masalah kepemilikan
perbaiki_masalah_kepemilikan() {
    local path_repo=$(pwd)
    echo -e "${KUNING}Menangani masalah kepemilikan Git...${NC}"
    
    git config --global --add safe.directory "$path_repo" 2>/dev/null
    git config --global --add safe.directory '*' 2>/dev/null
    
    find . -type d -name ".git" -exec chmod 755 {} \; 2>/dev/null
    find . -name ".gitconfig" -exec chmod 644 {} \; 2>/dev/null
    
    echo -e "${HIJAU}Masalah kepemilikan telah diperbaiki!${NC}"
    return 0
}

# Fungsi untuk mengelola autentikasi
kelola_autentikasi() {
    local token_tersimpan=$(baca_token)
    
    if [ -n "$token_tersimpan" ]; then
        echo -e "${HIJAU}Token ditemukan di penyimpanan${NC}"
        echo -e "${KUNING}Ingin menggunakan token yang disimpan atau memasukkan token baru?${NC}"
        read -p "Gunakan token yang disimpan (s) atau token baru (n)? (s/n): " pilihan_token
        
        if [[ "$pilihan_token" == "s" || "$pilihan_token" == "S" ]]; then
            if validasi_token "$token_tersimpan"; then
                echo -e "${HIJAU}Token valid!${NC}"
                GITHUB_TOKEN=$token_tersimpan
                return 0
            else
                echo -e "${KUNING}Token tidak valid, menghapus...${NC}"
                rm -f "$TOKEN_FILE"
            fi
        fi
    fi
    
    # Minta token baru
    while true; do
        echo -e "${CYAN}Masukkan Token Akses GitHub Anda:${NC}"
        echo -e "${KUNING}(Token akan disimpan secara aman untuk penggunaan masa depan)${NC}"
        read -s -p "Token: " token_input
        echo
        
        if [ -z "$token_input" ]; then
            echo -e "${MERAH}Token tidak boleh kosong!${NC}"
            continue
        fi
        
        if validasi_token "$token_input"; then
            simpan_token "$token_input"
            GITHUB_TOKEN=$token_input
            echo -e "${HIJAU}Autentikasi berhasil!${NC}"
            return 0
        else
            echo -e "${MERAH}Token tidak valid!${NC}"
            read -p "Coba lagi? (y/n): " coba_lagi
            if [[ "$coba_lagi" != "y" && "$coba_lagi" != "Y" ]]; then
                return 1
            fi
        fi
    done
}

# Fungsi untuk menambahkan remote repository
tambahkan_remote_repository() {
    local url_repo
    while true; do
        read -p "Masukkan URL GitHub repository: " url_repo
        
        if [ -z "$url_repo" ]; then
            echo -e "${MERAH}URL tidak boleh kosong!${NC}"
            continue
        fi
        
        if validasi_url_github "$url_repo"; then
            # Tes koneksi
            echo -e "${CYAN}Menguji koneksi ke GitHub...${NC}"
            if [[ $url_repo == https* ]]; then
                domain=$(echo "$url_repo" | cut -d'/' -f3)
            else
                domain=$(echo "$url_repo" | cut -d'@' -f2 | cut -d':' -f1)
            fi
            
            if ping -c 1 -W 1 "$domain" &> /dev/null; then
                echo -e "${HIJAU}Koneksi berhasil!${NC}"
            else
                echo -e "${KUNING}Peringatan: Tidak dapat menjangkau GitHub. Melanjutkan...${NC}"
            fi

            # Coba tambahkan remote
            if git remote add origin "$url_repo" 2>/dev/null; then
                echo -e "${HIJAU}Remote repository berhasil ditambahkan!${NC}"
                return 0
            else
                if git remote add origin "$url_repo" 2>&1 | grep -q "dubious ownership"; then
                    perbaiki_masalah_kepemilikan
                    if git remote add origin "$url_repo" 2>/dev/null; then
                        echo -e "${HIJAU}Remote repository berhasil ditambahkan!${NC}"
                        return 0
                    fi
                fi
                
                if git remote get-url origin &>/dev/null; then
                    read -p "Remote origin sudah ada. Perbarui URL? (y/n): " pilihan_update
                    if [[ "$pilihan_update" == "y" || "$pilihan_update" == "Y" ]]; then
                        git remote set-url origin "$url_repo"
                        if [ $? -eq 0 ]; then
                            echo -e "${HIJAU}URL remote berhasil diperbarui!${NC}"
                            return 0
                        else
                            echo -e "${MERAH}Gagal memperbarui URL remote.${NC}"
                        fi
                    else
                        echo -e "${KUNING}Menggunakan remote yang sudah ada.${NC}"
                        return 0
                    fi
                fi
            fi
        else
            echo -e "${MERAH}Format URL tidak valid!${NC}"
            echo -e "${KUNING}Contoh format yang valid:"
            echo -e "  HTTPS: https://github.com/pengguna/repository.git"
            echo -e "  SSH: git@github.com:pengguna/repository.git${NC}"
        fi
        
        read -p "Coba lagi? (y/n): " coba_lagi
        if [[ "$coba_lagi" != "y" && "$coba_lagi" != "Y" ]]; then
            echo -e "${KUNING}Melanjutkan tanpa remote repository...${NC}"
            return 1
        fi
    done
}

# Fungsi untuk inisialisasi repository
inisialisasi_repository() {
    echo -e "${CYAN}Menginisialisasi repository Git...${NC}"
    
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        echo -e "${KUNING}Repository Git sudah diinisialisasi.${NC}"
        return 0
    fi
    
    if git init --initial-branch=main 2>/dev/null; then
        echo -e "${HIJAU}Repository Git berhasil diinisialisasi!${NC}"
        perbaiki_masalah_kepemilikan
        return 0
    else
        if git init 2>/dev/null; then
            echo -e "${HIJAU}Repository Git berhasil diinisialisasi!${NC}"
            perbaiki_masalah_kepemilikan
            return 0
        else
            echo -e "${MERAH}Gagal menginisialisasi repository Git.${NC}"
            return 1
        fi
    fi
}

# Fungsi untuk menambahkan file ke staging
tambahkan_file_ke_staging() {
    echo -e "${CYAN}Menambahkan perubahan ke staging area...${NC}"
    
    if git add --all 2>/dev/null; then
        echo -e "${HIJAU}Semua perubahan berhasil ditambahkan!${NC}"
        return 0
    else
        if git add --all 2>&1 | grep -q "dubious ownership"; then
            perbaiki_masalah_kepemilikan
            if git add --all 2>/dev/null; then
                echo -e "${HIJAU}Perubahan berhasil ditambahkan!${NC}"
                return 0
            fi
        fi
        
        echo -e "${KUNING}Mencoba metode alternatif...${NC}"
        for file in $(git status --porcelain 2>/dev/null | awk '{print $2}'); do
            git add "$file" 2>/dev/null || \
            echo -e "${KUNING}Tidak dapat menambahkan: $file${NC}"
        done
        
        if [ $(git status --porcelain 2>/dev/null | wc -l) -gt 0 ]; then
            echo -e "${HIJAU}Sebagian besar perubahan berhasil ditambahkan!${NC}"
            return 0
        else
            echo -e "${MERAH}Gagal menambahkan perubahan.${NC}"
            return 1
        fi
    fi
}

# Fungsi untuk menampilkan status repository
tampilkan_status_repository() {
    echo -e "\n${CYAN}Status repository saat ini:${NC}"
    
    if git status --short 2>/dev/null; then
        return 0
    else
        if git status --short 2>&1 | grep -q "dubious ownership"; then
            perbaiki_masalah_kepemilikan
            git status --short
            return 0
        fi
        echo -e "${MERAH}Gagal mendapatkan status repository.${NC}"
        return 1
    fi
}

# Fungsi untuk melakukan commit
buat_commit() {
    local pesan_commit
    local pesan_default="Commit otomatis: $(date +'%Y-%m-%d %H:%M:%S')"
    
    echo -e "\n${KUNING}Masukkan pesan commit (default: \"$pesan_default\"):${NC}"
    read -e pesan_commit

    pesan_commit=${pesan_commit:-$pesan_default}

    echo -e "\n${CYAN}Membuat commit...${NC}"
    
    for percobaan in {1..3}; do
        if git commit -m "$pesan_commit" 2>/dev/null; then
            echo -e "${HIJAU}Commit berhasil!${NC}"
            return 0
        else
            if git commit -m "$pesan_commit" 2>&1 | grep -q "dubious ownership"; then
                perbaiki_masalah_kepemilikan
                continue
            fi
            
            if git commit -m "$pesan_commit" 2>&1 | grep -q "nothing to commit"; then
                echo -e "${KUNING}Tidak ada perubahan untuk di-commit.${NC}"
                return 1
            fi
            
            if [ $percobaan -eq 3 ]; then
                echo -e "${MERAH}Gagal commit setelah beberapa percobaan.${NC}"
                return 1
            fi
            
            echo -e "${KUNING}Percobaan commit ke-$percobaan gagal, mencoba lagi...${NC}"
            sleep 1
        fi
    done
}

# Fungsi untuk push ke GitHub
push_ke_github() {
    echo -e "\n${CYAN}Mendorong perubahan ke GitHub...${NC}"
    
    local cabang=()
    if git show-ref --verify --quiet refs/heads/main 2>/dev/null; then
        cabang+=("main")
    fi
    if git show-ref --verify --quiet refs/heads/master 2>/dev/null; then
        cabang+=("master")
    fi
    
    if [ ${#cabang[@]} -eq 0 ]; then
        # Coba dapatkan cabang saat ini
        current_branch=$(git symbolic-ref --short HEAD 2>/dev/null)
        if [ -n "$current_branch" ]; then
            cabang+=("$current_branch")
        else
            echo -e "${MERAH}Tidak ada cabang yang ditemukan untuk didorong!${NC}"
            return 1
        fi
    fi

    for branch in "${cabang[@]}"; do
        echo -e "${KUNING}Mencoba mendorong cabang: $branch${NC}"
        
        if git push -u origin "$branch" 2>/dev/null; then
            echo -e "${HIJAU}Berhasil mendorong cabang $branch!${NC}"
            return 0
        else
            if git push -u origin "$branch" 2>&1 | grep -q "dubious ownership"; then
                perbaiki_masalah_kepemilikan
                if git push -u origin "$branch" 2>/dev/null; then
                    echo -e "${HIJAU}Berhasil mendorong cabang $branch!${NC}"
                    return 0
                fi
            fi
            
            if git push -u origin "$branch" 2>&1 | grep -q "non-fast-forward"; then
                echo -e "${KUNING}Error non-fast-forward. Mencoba force push...${NC}"
                if git push -u origin "$branch" --force 2>/dev/null; then
                    echo -e "${HIJAU}Force push berhasil!${NC}"
                    return 0
                fi
            fi
        fi
    done
    
    echo -e "${MERAH}Gagal push ke GitHub setelah beberapa percobaan.${NC}"
    echo -e "${KUNING}Periksa koneksi internet dan izin repository.${NC}"
    return 1
}

# Fungsi untuk pemeriksaan sistem
pemeriksaan_sistem() {
    echo -e "${CYAN}Menjalankan diagnostik sistem...${NC}"
    
    local error=0
    
    if ! command -v git &> /dev/null; then
        echo -e "${MERAH}ERROR: Git tidak terinstall${NC}"
        error=$((error+1))
    else
        echo -e "${HIJAU}✓ Git terinstall${NC}"
    fi
    
    if ping -c 1 -W 2 github.com &> /dev/null; then
        echo -e "${HIJAU}✓ Koneksi internet tersedia${NC}"
    else
        echo -e "${KUNING}⚠ Tidak dapat menjangkau GitHub (mungkin behind firewall)${NC}"
    fi
    
    local ruang_kosong=$(df -h . 2>/dev/null | awk 'NR==2 {print $4}')
    if [ -n "$ruang_kosong" ]; then
        echo -e "${HIJAU}✓ Ruang disk tersedia: $ruang_kosong${NC}"
    else
        echo -e "${KUNING}⚠ Tidak dapat memeriksa ruang disk${NC}"
    fi
    
    return $error
}

# Fungsi utama
main() {
    # Setup awal
    setup_konfigurasi
    dapatkan_info_sistem
    tampilkan_header
    
    # Pemeriksaan sistem
    if ! pemeriksaan_sistem; then
        echo -e "${KUNING}Melanjutkan dengan peringatan...${NC}"
    fi

    # Kelola informasi user
    kelola_info_user

    # Kelola autentikasi
    if ! kelola_autentikasi; then
        echo -e "${MERAH}Gagal autentikasi. Keluar.${NC}"
        exit 1
    fi

    # Inisialisasi repository
    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        echo -e "\n${KUNING}Direktori ini bukan repository Git.${NC}"
        read -p "Inisialisasi repository Git baru? (y/n): " pilihan_init
        
        if [[ "$pilihan_init" != "y" && "$pilihan_init" != "Y" ]]; then
            echo -e "${MERAH}Operasi dibatalkan.${NC}"
            exit 1
        fi
        
        if ! inisialisasi_repository; then
            echo -e "${MERAH}Gagal menginisialisasi repository.${NC}"
            exit 1
        fi
        
        tambahkan_remote_repository
    else
        echo -e "${HIJAU}✓ Sudah dalam repository Git${NC}"
        perbaiki_masalah_kepemilikan
        
        if ! git remote get-url origin &> /dev/null; then
            echo -e "${KUNING}Remote origin belum dikonfigurasi.${NC}"
            tambahkan_remote_repository
        else
            echo -e "${HIJAU}Remote origin: ${PUTIH}$(git remote get-url origin)${NC}"
        fi
    fi

    # Proses staging dan commit
    if ! tambahkan_file_ke_staging; then
        echo -e "${MERAH}Gagal menambahkan perubahan.${NC}"
        exit 1
    fi

    tampilkan_status_repository

    if ! buat_commit; then
        echo -e "${KUNING}Melanjutkan tanpa commit...${NC}"
    fi

    # Push ke GitHub
    if git remote get-url origin &> /dev/null; then
        push_ke_github
    else
        echo -e "${KUNING}Remote origin belum dikonfigurasi, melewati push.${NC}"
    fi

    # Status akhir
    echo -e "\n${UNGU}════════════════════════════════════════════════════════════${NC}"
    echo -e "${HIJAU}✅ Proses selesai!${NC}"
    echo -e "${UNGU}════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}Terima kasih telah menggunakan tool ini!${NC}"
    echo -e "${CYAN}Xbibz Ofc${NC}"
    
    # Tampilkan status repository akhir
    echo -e "\n${KUNING}Status repository akhir:${NC}"
    git status --short 2>/dev/null || true
}

# Penanganan error dan eksekusi
trap "echo -e '${MERAH}Script diinterupsi pengguna. Keluar...${NC}'; exit 1" SIGINT

# Jalankan program utama
if main "$@"; then
    exit 0
else
    echo -e "${MERAH}Eksekusi script gagal dengan error.${NC}"
    exit 1
fi