import os

import psutil

try:
    from pynvml import (
        NVMLError,
        nvmlDeviceGetCount,
        nvmlDeviceGetHandleByIndex,
        nvmlDeviceGetMemoryInfo,
        nvmlDeviceGetName,
        nvmlDeviceGetTemperature,
        nvmlDeviceGetUtilizationRates,
        nvmlInit,
        nvmlShutdown,
        NVML_TEMPERATURE_GPU,
    )

    NVIDIA_GPU_AVAILABLE = True
except ImportError:
    NVIDIA_GPU_AVAILABLE = False

    class NVMLError(Exception):
        pass


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
    "hugetlbfs",
}


def should_hide_disk(disk):
    device = (disk.device or "").lower()
    mountpoint = (disk.mountpoint or "").lower()
    filesystem = (disk.fstype or "").lower()

    if device.startswith("/dev/loop"):
        return True

    if filesystem in VIRTUAL_FILE_SYSTEMS:
        if mountpoint != "/":
            return True

    hidden_mountpoints = (
        "/proc",
        "/sys",
        "/dev",
        "/run",
        "/snap",
    )

    if mountpoint.startswith(hidden_mountpoints):
        return True

    return False


def get_drive_name(disk):
    if os.name == "nt":
        return disk.device

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

            if mountpoint in seen_mountpoints:
                continue

            usage = psutil.disk_usage(mountpoint)

            if usage.total <= 0:
                continue

            seen_mountpoints.add(mountpoint)

            drives.append(
                {
                    "drive": get_drive_name(disk),
                    "used": round(
                        usage.used / (1024 ** 3),
                        1,
                    ),
                    "total": round(
                        usage.total / (1024 ** 3),
                        1,
                    ),
                    "percent": round(
                        usage.percent,
                        1,
                    ),
                }
            )

        except (
            PermissionError,
            FileNotFoundError,
            OSError,
        ):
            continue

    return drives


def get_gpu_info():
    default_gpu_info = {
        "gpu_available": False,
        "gpu_name": None,
        "gpu_usage": None,
        "gpu_temperature": None,
        "gpu_memory_used_gb": None,
        "gpu_memory_total_gb": None,
        "gpu_memory_percent": None,
    }

    if not NVIDIA_GPU_AVAILABLE:
        return default_gpu_info

    initialized = False

    try:
        nvmlInit()
        initialized = True

        gpu_count = nvmlDeviceGetCount()

        if gpu_count <= 0:
            return default_gpu_info

        handle = nvmlDeviceGetHandleByIndex(0)

        utilization = nvmlDeviceGetUtilizationRates(
            handle
        )

        memory = nvmlDeviceGetMemoryInfo(
            handle
        )

        temperature = nvmlDeviceGetTemperature(
            handle,
            NVML_TEMPERATURE_GPU,
        )

        gpu_name = nvmlDeviceGetName(handle)

        if isinstance(gpu_name, bytes):
            gpu_name = gpu_name.decode(
                "utf-8",
                errors="replace",
            )

        memory_percent = 0

        if memory.total > 0:
            memory_percent = (
                memory.used / memory.total
            ) * 100

        return {
            "gpu_available": True,
            "gpu_name": str(gpu_name),
            "gpu_usage": round(
                float(utilization.gpu),
                1,
            ),
            "gpu_temperature": round(
                float(temperature),
                1,
            ),
            "gpu_memory_used_gb": round(
                memory.used / (1024 ** 3),
                2,
            ),
            "gpu_memory_total_gb": round(
                memory.total / (1024 ** 3),
                2,
            ),
            "gpu_memory_percent": round(
                memory_percent,
                1,
            ),
        }

    except (
        NVMLError,
        OSError,
        ValueError,
    ):
        return default_gpu_info

    finally:
        if initialized:
            try:
                nvmlShutdown()
            except NVMLError:
                pass


def get_system_info():
    memory = psutil.virtual_memory()
    network = psutil.net_io_counters()
    gpu = get_gpu_info()

    return {
        "cpu_usage": psutil.cpu_percent(
            interval=0.5
        ),

        "ram_usage": memory.percent,

        "ram_used_gb": round(
            memory.used / (1024 ** 3),
            1,
        ),

        "ram_total_gb": round(
            memory.total / (1024 ** 3),
            1,
        ),

        "download_mb": round(
            network.bytes_recv / (1024 ** 2),
            2,
        ),

        "upload_mb": round(
            network.bytes_sent / (1024 ** 2),
            2,
        ),

        "drives": get_storage_info(),

        **gpu,
    }