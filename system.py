import os

import psutil


VIRTUAL_FILE_SYSTEMS = {
    "proc",
    "sysfs",
    "tmpfs",
    "devtmpfs",
    "devpts",
    "squashfs",
    "overlay",
    "cgroup",
    "cgroup2",
    "securityfs",
    "pstore",
    "debugfs",
    "tracefs",
    "fusectl",
    "configfs",
    "mqueue",
    "hugetlbfs"
}


def should_hide_disk(disk):
    device = (disk.device or "").lower()
    mountpoint = (disk.mountpoint or "").lower()
    filesystem = (disk.fstype or "").lower()

    # إخفاء Loop Devices في Linux وCodespaces
    if device.startswith("/dev/loop"):
        return True

    # إخفاء الأقراص الوهمية الخاصة بالنظام
    if filesystem in VIRTUAL_FILE_SYSTEMS:
        # نخلي القرص الرئيسي "/" يظهر حتى لو كان Overlay داخل Codespaces
        if mountpoint != "/":
            return True

    hidden_mountpoints = (
        "/proc",
        "/sys",
        "/dev",
        "/run",
        "/snap"
    )

    if mountpoint.startswith(hidden_mountpoints):
        return True

    return False


def get_drive_name(disk):
    # Windows: يظهر C:\ و D:\
    if os.name == "nt":
        return disk.device

    # Linux / Codespaces
    if disk.mountpoint == "/":
        return "System Drive /"

    return disk.mountpoint or disk.device


def get_storage_info():
    drives = []
    seen_mountpoints = set()

    for disk in psutil.disk_partitions(all=False):
        try:
            if should_hide_disk(disk):
                continue

            mountpoint = disk.mountpoint

            # منع تكرار نفس القرص
            if mountpoint in seen_mountpoints:
                continue

            usage = psutil.disk_usage(mountpoint)

            # تجاهل الأقراص بدون مساحة حقيقية
            if usage.total <= 0:
                continue

            seen_mountpoints.add(mountpoint)

            drives.append({
                "drive": get_drive_name(disk),
                "used": round(
                    usage.used / (1024 ** 3),
                    1
                ),
                "total": round(
                    usage.total / (1024 ** 3),
                    1
                ),
                "percent": round(
                    usage.percent,
                    1
                )
            })

        except (
            PermissionError,
            FileNotFoundError,
            OSError
        ):
            continue

    return drives


def get_system_info():
    memory = psutil.virtual_memory()
    network = psutil.net_io_counters()

    return {
        "cpu_usage": psutil.cpu_percent(
            interval=0.5
        ),

        "ram_usage": memory.percent,

        "ram_used_gb": round(
            memory.used / (1024 ** 3),
            1
        ),

        "ram_total_gb": round(
            memory.total / (1024 ** 3),
            1
        ),

        "download_mb": round(
            network.bytes_recv / (1024 ** 2),
            2
        ),

        "upload_mb": round(
            network.bytes_sent / (1024 ** 2),
            2
        ),

        "drives": get_storage_info()
    }