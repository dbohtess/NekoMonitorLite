import psutil


def get_system_info():
    memory = psutil.virtual_memory()

    disks = []

    for disk in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(disk.mountpoint)

            disks.append({
                "drive": disk.device,
                "used": round(usage.used / (1024**3), 1),
                "total": round(usage.total / (1024**3), 1),
                "percent": usage.percent
            })

        except PermissionError:
            pass

    network = psutil.net_io_counters()

    return {

        "cpu_usage": psutil.cpu_percent(interval=0.5),

        "ram_usage": memory.percent,

        "ram_used_gb": round(memory.used / (1024**3), 1),

        "ram_total_gb": round(memory.total / (1024**3), 1),

        "download_mb": round(network.bytes_recv / (1024**2), 2),

        "upload_mb": round(network.bytes_sent / (1024**2), 2),

        "drives": disks

    }