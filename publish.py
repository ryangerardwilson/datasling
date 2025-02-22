#!/usr/bin/env python3
"""
This script publishes your Node/Electron datasling project (versioned with .deb repackaging).
It assumes that:
  • Your Electron build is created via "npm run make" (producing a .deb in electron/out/make/deb/x64)
  • The original .deb is named like: datasling_1.0.0_amd64.deb
  • A remote APT repository tree is stored on your VM.

All published files will be placed under:
  /home/rgw/Apps/frontend-sites/files.ryangerardwilson.com/datasling

SSH details are read from ~/.rgwfuncsrc under the preset "icdattcwsm".

The script performs these steps:
  1. Query the remote repository to compute a new version number.
  2. Updates electron/package.json and electron/renderer-modules/asciiIntro.js with the new version.
  3. Builds the project with "npm run make" (executed from the electron dir).
  4. Locates the built .deb, extracts it and updates:
       • The control file with the new version.
       • Adds a post-installation script (postinst) to fix chrome-sandbox permissions.
  5. Builds a fresh .deb and updates the APT repository structure.
  6. Pushes the repository to the remote server.
  7. Cleans up old build folders and .deb files.
"""
import os
import subprocess
import shutil
import json
import re
import glob
from packaging.version import parse as parse_version
import tempfile

# Optionally force a new major version (set to an integer, e.g., 1) or leave as None.
MAJOR_RELEASE_NUMBER = 0

###############################################################################
# UPDATE electron/package.json VERSION
###############################################################################


def update_package_json_version(new_version):
    pkgjson_path = os.path.join("electron", "package.json")
    if not os.path.exists(pkgjson_path):
        raise FileNotFoundError(f"package.json not found at {pkgjson_path}")

    with open(pkgjson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    current_version = data.get("version", None)
    print(f"[INFO] Current package.json version: {current_version}")

    data["version"] = new_version
    with open(pkgjson_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[INFO] Updated package.json version to: {new_version}")

###############################################################################
# UPDATE electron/renderer-modules/asciiIntro.js VERSION
###############################################################################


def update_ascii_intro_js_version(new_version):
    filename = os.path.join("electron", "lib", "renderer", "asciiIntro.js")
    if not os.path.exists(filename):
        raise FileNotFoundError(f"{filename} not found")

    with open(filename, "r", encoding="utf-8") as f:
        contents = f.read()

    new_declaration = f'const dataslingVersion = "{new_version}";'
    updated_contents = re.sub(
        r'^\s*const\s+dataslingVersion\s*=\s*".*?";',
        new_declaration,
        contents,
        flags=re.MULTILINE
    )

    with open(filename, "w", encoding="utf-8") as f:
        f.write(updated_contents)

    print(f"[INFO] Updated {filename} with version: {new_version}")

###############################################################################
# MANAGE font size discrepencies
###############################################################################


def add_html_font_size(font_size="24px"):
    filename = os.path.join("electron", "index.html")
    if not os.path.exists(filename):
        raise FileNotFoundError(f"{filename} not found")

    with open(filename, "r", encoding="utf-8") as f:
        contents = f.read()

    # Check if style tag exists
    if "<style>" not in contents:
        # If no style tag exists, add one with the font-size
        new_style = f"""<style>
    html {{
      font-size: {font_size};
    }}
</style>"""
        updated_contents = re.sub(
            r'</head>',
            f'  {new_style}\n  </head>',
            contents,
            flags=re.MULTILINE
        )
    else:
        # Check if font-size already exists in an html block
        if re.search(r'html\s*{[^}]*font-size:[^;]*;', contents):
            # Update existing font-size
            updated_contents = re.sub(
                r'(html\s*{[^}]*font-size:\s*)[^;]+(;[^}]*})',
                lambda m: m.group(1) + font_size + m.group(2),
                contents,
                flags=re.MULTILINE
            )
        # If html {} block exists but no font-size
        elif re.search(r'html\s*{[^}]*}', contents):
            # Add font-size to existing html block
            updated_contents = re.sub(
                r'(html\s*{)',
                f'\\1\n    font-size: {font_size};',
                contents,
                flags=re.MULTILINE
            )
        else:
            # Add new html block with font-size
            updated_contents = re.sub(
                r'(<style>)',
                f'\\1\n  html {{\n    font-size: {font_size};\n  }}',
                contents,
                flags=re.MULTILINE
            )

    with open(filename, "w", encoding="utf-8") as f:
        f.write(updated_contents)

    print(f"[INFO] Set font-size to {font_size} in {filename}")

###############################################################################
# GET NEW VERSION
###############################################################################


def get_new_version(MAJOR_RELEASE_NUMBER=None):
    config_path = os.path.expanduser("~/.rgwfuncsrc")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Cannot find config file: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    vm_presets = data.get("vm_presets", [])
    preset = next((p for p in vm_presets if p.get("name") == "icdattcwsm"), None)
    if not preset:
        raise ValueError("No preset named 'icdattcwsm' found in ~/.rgwfuncsrc")
    host = preset["host"]
    ssh_user = preset["ssh_user"]
    ssh_key_path = preset["ssh_key_path"]

    # Remote .deb files are located under:
    remote_deb_dir = "/home/rgw/Apps/frontend-sites/files.ryangerardwilson.com/datasling/debian/dists/stable/main/binary-amd64"
    ssh_cmd = (
        f"ssh -i {ssh_key_path} {ssh_user}@{host} "
        f"\"find {remote_deb_dir} -maxdepth 1 -type f -name 'datasling_*.deb'\""
    )
    try:
        output = subprocess.check_output(ssh_cmd, shell=True).decode("utf-8").strip()
    except subprocess.CalledProcessError:
        output = ""

    print(f"[DEBUG] SSH command output:\n{output}")

    if not output:
        new_major = int(MAJOR_RELEASE_NUMBER) if MAJOR_RELEASE_NUMBER is not None else 0
        new_version = f"{new_major}.0.1-1"
        print(f"[INFO] No existing .deb found remotely – using initial version {new_version}")
        return new_version

    deb_file_path = output.split("\n")[-1].strip()
    filename = os.path.basename(deb_file_path)

    match = re.match(r"^datasling_(\d+\.\d+\.\d+)(?:-(\d+))?_amd64\.deb$", filename)
    if not match:
        raise ValueError(f"Could not parse version from deb file name: {filename}")

    version_str = match.group(1)
    revision_str = match.group(2) if match.group(2) is not None else "1"

    major_str, minor_str, patch_str = version_str.split(".")
    server_major = int(major_str)
    server_minor = int(minor_str)
    server_patch = int(patch_str)
    server_revision = int(revision_str)

    if MAJOR_RELEASE_NUMBER is None:
        new_major = server_major
        new_minor = server_minor
        new_patch = server_patch + 1
        new_revision = server_revision
    else:
        user_major = int(MAJOR_RELEASE_NUMBER)
        if user_major == server_major:
            new_major = server_major
            new_minor = server_minor
            new_patch = server_patch + 1
            new_revision = server_revision
        else:
            new_major = user_major
            new_minor = 0
            new_patch = 1
            new_revision = 1

    new_version = f"{new_major}.{new_minor}.{new_patch}-{new_revision}"
    print(f"[INFO] Computed new version: {new_version}")
    return new_version

###############################################################################
# REMOVE OLD REMOTE DEBS
###############################################################################


def remove_old_remote_debs():
    import json
    config_path = os.path.expanduser("~/.rgwfuncsrc")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Cannot find config file: {config_path}")
    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    vm_presets = data.get("vm_presets", [])
    preset = next((p for p in vm_presets if p.get("name") == "icdattcwsm"), None)
    if not preset:
        raise ValueError("No preset named 'icdattcwsm' found in ~/.rgwfuncsrc")
    host = preset["host"]
    ssh_user = preset["ssh_user"]
    ssh_key_path = preset["ssh_key_path"]
    remote_deb_dir = (
        "/home/rgw/Apps/frontend-sites/files.ryangerardwilson.com/datasling/debian/dists/stable/main/binary-amd64"
    )
    ssh_cmd = (
        f"ssh -i {ssh_key_path} {ssh_user}@{host} \"bash -c 'cd {remote_deb_dir} && rm -f datasling_*.deb'\""
    )
    print("[INFO] Removing all remote .deb files...")
    subprocess.check_call(ssh_cmd, shell=True)
    print("[INFO] Removed all remote .deb files.")

###############################################################################
# PUBLISH RELEASE
###############################################################################


def publish_release(version):
    def build_deb(version):
        print("[INFO] Starting build_deb step…")
        update_package_json_version(version)
        update_ascii_intro_js_version(version)

        print("[INFO] Removing HTML font size for dist")
        add_html_font_size("14px")

        print("[INFO] Running 'npm run make' inside the electron directory...")
        subprocess.check_call("npm run make", shell=True, cwd="electron")

        print("[INFO] Re-adding HTML font size for dev")
        add_html_font_size("24px")

        # The built .deb is now in electron/out/make/deb/x64
        built_debs = glob.glob(os.path.join("electron", "out", "make", "deb", "x64", "datasling_*_amd64.deb"))
        if not built_debs:
            raise FileNotFoundError("No built datasling .deb found in electron/out/make/deb/x64")
        original_deb_file = sorted(built_debs)[0]
        print(f"[INFO] Found built .deb: {original_deb_file}")

        # Prepare repository build workspace under debian/version_build_folders
        build_root = os.path.join("debian", "version_build_folders", f"datasling_{version}")
        if os.path.exists(build_root):
            shutil.rmtree(build_root)
        os.makedirs(build_root, exist_ok=True)

        out_debs_dir = os.path.join("debian", "version_debs")
        os.makedirs(out_debs_dir, exist_ok=True)

        print(f"[INFO] Extracting {original_deb_file} into {build_root} …")
        subprocess.check_call(["dpkg-deb", "-R", original_deb_file, build_root])

        # Update the control file with the new version.
        control_path = os.path.join(build_root, "DEBIAN", "control")
        if not os.path.exists(control_path):
            raise FileNotFoundError(f"Control file not found at {control_path}")
        with open(control_path, "r", encoding="utf-8") as f:
            control_lines = f.readlines()
        new_control_lines = []
        for line in control_lines:
            if line.startswith("Version:"):
                new_control_lines.append(f"Version: {version}\n")
            else:
                new_control_lines.append(line)
        with open(control_path, "w", encoding="utf-8") as f:
            f.writelines(new_control_lines)
        print(f"[INFO] Updated control file with version {version}")

        # Create a postinst script that will be executed upon installation.
        postinst_path = os.path.join(build_root, "DEBIAN", "postinst")
        postinst_contents = """#!/bin/bash
set -e
# Ensure that the chrome-sandbox binary is owned by root and has mode 4755.
chown root:root /usr/lib/datasling/chrome-sandbox
chmod 4755 /usr/lib/datasling/chrome-sandbox
exit 0
"""
        with open(postinst_path, "w", encoding="utf-8") as f:
            f.write(postinst_contents)
        # Set the executable permission for postinst.
        os.chmod(postinst_path, 0o755)
        print(f"[INFO] Created and set permissions for postinst script at {postinst_path}")

        output_deb = os.path.join(out_debs_dir, f"datasling_{version}_amd64.deb")
        subprocess.check_call(["dpkg-deb", "--build", build_root, output_deb])
        print(f"[INFO] Built new .deb: {output_deb}")

    def prepare_deb_for_distribution(version):
        print("[INFO] Starting prepare_deb_for_distribution step…")
        stable_dir = os.path.join("debian", "dists", "stable")
        if os.path.exists(stable_dir):
            print(f"[INFO] Removing old {stable_dir} …")
            shutil.rmtree(stable_dir)
        apt_binary_dir = os.path.join(stable_dir, "main", "binary-amd64")
        os.makedirs(apt_binary_dir, exist_ok=True)
        overrides_path = os.path.join(apt_binary_dir, "overrides.txt")
        if not os.path.exists(overrides_path):
            with open(overrides_path, "w", encoding="utf-8") as f:
                f.write("datasling optional utils\n")
        print(f"[INFO] Verified overrides.txt at {overrides_path}")
        deb_source = os.path.join("debian", "version_debs", f"datasling_{version}_amd64.deb")
        if not os.path.exists(deb_source):
            raise FileNotFoundError(f"{deb_source} not found.")
        print(f"[INFO] Copying {deb_source} into {apt_binary_dir} …")
        shutil.copy2(deb_source, apt_binary_dir)
        packages_path = os.path.join(apt_binary_dir, "Packages")
        print("[INFO] Generating Packages file via dpkg-scanpackages …")
        pkg_cmd = ["dpkg-scanpackages", "--multiversion", ".", "overrides.txt"]
        with open(packages_path, "w", encoding="utf-8") as pf:
            subprocess.check_call(pkg_cmd, cwd=apt_binary_dir, stdout=pf)
        print(f"[INFO] Created Packages file at {packages_path}")
        new_lines = []
        prefix = "dists/stable/main/binary-amd64/"
        with open(packages_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("Filename: ./"):
                    line = line.replace("Filename: ./", f"Filename: {prefix}")
                new_lines.append(line)
        with open(packages_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print("[INFO] Adjusted Filename entries in Packages file.")
        packages_gz_path = os.path.join(apt_binary_dir, "Packages.gz")
        print("[INFO] Compressing Packages to Packages.gz …")
        with open(packages_gz_path, "wb") as f_out:
            subprocess.check_call(["gzip", "-9c", "Packages"], cwd=apt_binary_dir, stdout=f_out)
        print(f"[INFO] Created {packages_gz_path}")
        os.makedirs(stable_dir, exist_ok=True)
        apt_ftppath = os.path.join(stable_dir, "apt-ftparchive.conf")
        conf_content = """APT::FTPArchive::Release {
  Origin "dataslingRepo";
  Label "dataslingRepo";
  Suite "stable";
  Codename "stable";
  Architectures "amd64";
  Components "main";
};
"""
        with open(apt_ftppath, "w", encoding="utf-8") as f:
            f.write(conf_content)
        release_path = os.path.join(stable_dir, "Release")
        apt_ftparchive_cmd = ["apt-ftparchive", "-c", "apt-ftparchive.conf", "release", "."]
        print(f"[INFO] Generating Release file in {stable_dir} …")
        with open(release_path, "w", encoding="utf-8") as rf:
            subprocess.check_call(apt_ftparchive_cmd, cwd=stable_dir, stdout=rf)
        print(f"[INFO] Created Release file at {release_path}")
        print("[INFO] Signing Release file with GPG …")
        sign_cmd = [
            "gpg",
            "--local-user", "172E2D67FB733C7EB47DEA047FE8FD47C68DC85A",
            "--detach-sign",
            "--armor",
            "--output", "Release.gpg",
            "Release"
        ]
        subprocess.check_call(sign_cmd, cwd=stable_dir)
        print("[INFO] Signed Release file (Release.gpg created).")

    def push_to_server():
        print("[INFO] Starting push_to_server step…")
        funcs_path = os.path.expanduser("~/.rgwfuncsrc")
        if not os.path.exists(funcs_path):
            raise FileNotFoundError(f"Cannot find config file: {funcs_path}")
        with open(funcs_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        vm_presets = data.get("vm_presets", [])
        preset = next((p for p in vm_presets if p.get("name") == "icdattcwsm"), None)
        if not preset:
            raise ValueError("No preset named 'icdattcwsm' found in ~/.rgwfuncsrc")
        host = preset["host"]
        ssh_user = preset["ssh_user"]
        ssh_key_path = preset["ssh_key_path"]
        remote_path = "/home/rgw/Apps/frontend-sites/files.ryangerardwilson.com/datasling"
        ssh_cmd = f"ssh -i {ssh_key_path} {ssh_user}@{host} 'rm -rf {remote_path}debian'"
        print(f"[INFO] Removing remote repository folder {remote_path}debian …")
        subprocess.check_call(ssh_cmd, shell=True)
        rsync_cmd = (
            f"rsync -avz -e 'ssh -i {ssh_key_path}' "
            "--exclude 'version_build_folders' --exclude 'version_debs' "
            f"debian/ {ssh_user}@{host}:{remote_path}/debian"
        )
        print(f"[INFO] Uploading local repository (debian) folder to {remote_path}/debian …")
        subprocess.check_call(rsync_cmd, shell=True)
        print("[INFO] push_to_server completed successfully.")

    def delete_all_but_last_version_build_folders():
        build_folders_path = os.path.join("debian", "version_build_folders")
        if not os.path.exists(build_folders_path):
            return
        version_folders = [f for f in os.listdir(build_folders_path)
                           if os.path.isdir(os.path.join(build_folders_path, f)) and f.startswith("datasling_")]
        version_folders.sort(key=lambda x: parse_version(x.split('_')[1]), reverse=True)
        for folder in version_folders[1:]:
            folder_path = os.path.join(build_folders_path, folder)
            print(f"[INFO] Deleting old build folder: {folder_path}")
            shutil.rmtree(folder_path)

    def delete_all_but_last_version_debs():
        debs_dir = os.path.join("debian", "version_debs")
        if not os.path.exists(debs_dir):
            return
        deb_files = [f for f in os.listdir(debs_dir)
                     if os.path.isfile(os.path.join(debs_dir, f)) and f.endswith(".deb")]
        deb_files.sort(key=lambda x: parse_version(x.split('_')[1].replace("_amd64.deb", "")), reverse=True)
        for deb in deb_files[1:]:
            deb_path = os.path.join(debs_dir, deb)
            print(f"[INFO] Deleting old .deb file: {deb_path}")
            os.remove(deb_path)

    # Run steps sequentially.
    build_deb(version)
    prepare_deb_for_distribution(version)
    remove_old_remote_debs()
    push_to_server()
    delete_all_but_last_version_build_folders()
    delete_all_but_last_version_debs()
    print("[INFO] publish_release completed successfully.")

##################################################################################
# PUBLISH INSTALL SCRIPT
##################################################################################


def publish_install_script():
    install_sh_contents = """#!/bin/bash
# This installation script configures the datasling repository and fixes chrome-sandbox permissions.
# Run with: bash -c "sh <(curl -fsSL https://files.ryangerardwilson.com/datasling/install.sh)"
set -e

# Import apt repository key and save it to /usr/share/keyrings/datasling.gpg
curl -fsSL https://files.ryangerardwilson.com/datasling/debian/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/datasling.gpg

# Add datasling repository to your system sources list.
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/datasling.gpg] https://files.ryangerardwilson.com/datasling/debian stable main" | sudo tee /etc/apt/sources.list.d/datasling.list

# Update apt and install the datasling package.
sudo apt update
sudo apt-get install datasling

echo "Installation complete."
"""
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as tmpfile:
        tmpfile.write(install_sh_contents)
        local_install_script = tmpfile.name

    print("[INFO] Temporary install.sh written to:", local_install_script)

    funcs_path = os.path.expanduser("~/.rgwfuncsrc")
    if not os.path.exists(funcs_path):
        raise FileNotFoundError(f"Cannot find config file: {funcs_path}")
    with open(funcs_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    vm_presets = data.get("vm_presets", [])
    preset = next((p for p in vm_presets if p.get("name") == "icdattcwsm"), None)
    if not preset:
        raise ValueError("No preset named 'icdattcwsm' found in ~/.rgwfuncsrc")
    host = preset["host"]
    ssh_user = preset["ssh_user"]
    ssh_key_path = preset["ssh_key_path"]

    remote_path = "/home/rgw/Apps/frontend-sites/files.ryangerardwilson.com/datasling/install.sh"

    rsync_cmd = (
        f"rsync -avz -e 'ssh -i {ssh_key_path}' {local_install_script} {ssh_user}@{host}:{remote_path}"
    )
    print("[INFO] Running rsync command:")
    print(rsync_cmd)
    subprocess.check_call(rsync_cmd, shell=True)
    print(f"[INFO] install.sh published to {remote_path}")

    chmod_cmd = f"ssh -i {ssh_key_path} {ssh_user}@{host} 'chmod 644 {remote_path}'"
    print("[INFO] Running remote chmod command:")
    print(chmod_cmd)
    subprocess.check_call(chmod_cmd, shell=True)
    print("[INFO] Remote install.sh permissions updated to 644.")

    os.remove(local_install_script)


def main():
    new_version = get_new_version(MAJOR_RELEASE_NUMBER)
    publish_release(new_version)
    publish_install_script()


if __name__ == "__main__":
    main()
