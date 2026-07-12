"use strict";

/*
=========================================================
NekoMonitor Lite
static/app.js

Part 1 of 3

This file controls:

- System information from /api/system
- CPU, GPU and RAM gauges
- Live mini charts
- Storage information
- Network information
- Session timer
- Water reminder
- Nekorin reactions
- Nekorin mode toggle
- Connection status

IMPORTANT:
Part 2 must continue directly after the final line of this part.
=========================================================
*/


/*
=========================================================
APPLICATION CONFIGURATION
=========================================================
*/

const NEKO_MONITOR_CONFIG = Object.freeze({
    apiUrl: "desktop",

    systemRefreshIntervalMs: 2000,
    clockRefreshIntervalMs: 1000,
    sessionRefreshIntervalMs: 1000,

    chartMaximumPoints: 24,

    waterReminderIntervalMs: 45 * 60 * 1000,
    waterReminderWarningMs: 35 * 60 * 1000,

    longSessionWarningMs: 2 * 60 * 60 * 1000,
    veryLongSessionWarningMs: 3 * 60 * 60 * 1000,

    cpuMediumThreshold: 55,
    cpuHighThreshold: 75,
    cpuCriticalThreshold: 90,

    ramMediumThreshold: 65,
    ramHighThreshold: 80,
    ramCriticalThreshold: 92,

    gpuMediumThreshold: 60,
    gpuHighThreshold: 80,
    gpuCriticalThreshold: 92,

    requestTimeoutMs: 6000,

    images: Object.freeze({
        explain: "/static/explain.png",
        angry: "/static/angry.png",
        cry: "/static/cry.png",

        /*
        These images will be used automatically later
        when they are added to the static folder.
        */

        happy: "/static/happy.png",
        sleep: "/static/sleep.png",
        thinking: "/static/thinking.png"
    })
});


/*
=========================================================
NEKORIN DIALOGUE
=========================================================
*/

const NEKORIN_DIALOGUE = Object.freeze({
    normal: Object.freeze([
        "Everything looks good.",
        "Your computer is running smoothly.",
        "All systems look healthy, Sultan.",
        "NekoMonitor is watching your computer.",
        "Your system looks calm right now."
    ]),

    welcome: Object.freeze([
        "Welcome back, Sultan. I am watching your system.",
        "NekoMonitor Lite is ready.",
        "I am here, Sultan. Everything is connected.",
        "Your computer monitor is online."
    ]),

    cpuMedium: Object.freeze([
        "Your CPU is doing some work.",
        "CPU activity is getting higher.",
        "Your CPU load is rising, Sultan.",
        "The processor is becoming busy."
    ]),

    cpuHigh: Object.freeze([
        "Your CPU is getting hot.",
        "CPU usage is high. Keep an eye on it.",
        "Sultan, your processor is working very hard.",
        "High CPU load detected."
    ]),

    cpuCritical: Object.freeze([
        "Sultan! Your CPU usage is extremely high.",
        "The CPU is under heavy pressure.",
        "Critical CPU load detected. Check your programs.",
        "Your processor needs attention right now."
    ]),

    ramMedium: Object.freeze([
        "RAM usage is starting to increase.",
        "Your memory is getting busier.",
        "Several programs may be using your RAM."
    ]),

    ramHigh: Object.freeze([
        "Your RAM usage is high.",
        "Memory is getting full, Sultan.",
        "You may want to close an unused program.",
        "High memory usage detected."
    ]),

    ramCritical: Object.freeze([
        "Sultan! Your RAM is almost full.",
        "Critical memory usage detected.",
        "Your computer may become slow because RAM is nearly full.",
        "Please close some heavy programs."
    ]),

    gpuMedium: Object.freeze([
        "Your GPU is working.",
        "Graphics activity is increasing.",
        "The graphics card is becoming busy."
    ]),

    gpuHigh: Object.freeze([
        "Your GPU load is high.",
        "The graphics card is working very hard.",
        "Heavy GPU activity detected.",
        "Your game is making the GPU work hard."
    ]),

    gpuCritical: Object.freeze([
        "Sultan! GPU usage is extremely high.",
        "The graphics card is under maximum load.",
        "Critical GPU activity detected.",
        "Keep an eye on your GPU temperature."
    ]),

    waterWarning: Object.freeze([
        "Sultan, go drink some water 💧",
        "You have been sitting for a while. Drink some water.",
        "Hydration reminder, Sultan 💧",
        "Please drink water before you continue.",
        "Your computer is fine, but you need water."
    ]),

    waterCompleted: Object.freeze([
        "Good job, Sultan! Hydration reminder reset 💧",
        "Thank you for drinking water.",
        "Perfect. Stay hydrated, Sultan.",
        "Water completed. I am proud of you.",
        "Good! Your next water reminder has started."
    ]),

    longSession: Object.freeze([
        "Take a short break.",
        "You have been using the computer for a long time.",
        "Sultan, rest your eyes for a few minutes.",
        "Stand up and stretch a little.",
        "A short break will help you focus."
    ]),

    veryLongSession: Object.freeze([
        "Sultan, you really need a break now.",
        "This gaming session is very long.",
        "Please rest your eyes and move around.",
        "You have been sitting for too long.",
        "Save your work and take a proper break."
    ]),

    connectionError: Object.freeze([
        "I cannot read the system information.",
        "The system API is not responding.",
        "Connection lost. Check the Flask server.",
        "I cannot reach NekoMonitor's backend.",
        "The monitor connection has stopped."
    ]),

    modeDisabled: Object.freeze([
        "Nekorin Mode is sleeping.",
        "Assistant reactions are disabled.",
        "I will stay quiet for now."
    ]),

    modeEnabled: Object.freeze([
        "Nekorin Mode is active again.",
        "I am back, Sultan.",
        "Assistant reactions are now enabled."
    ])
});


/*
=========================================================
APPLICATION STATE
=========================================================
*/

const nekoMonitorState = {
    applicationStartedAt: Date.now(),

    lastSuccessfulUpdateAt: null,
    lastSystemData: null,

    isFetchingSystemData: false,
    isConnected: false,
    consecutiveRequestErrors: 0,

    nekorinModeEnabled: true,
    currentNekorinMood: "explain",
    currentNekorinMessageType: "welcome",
    lastNekorinMessage: "",

    lastWaterAt: Date.now(),
    waterReminderActive: false,
    waterReminderAcknowledged: false,

    lastUserActivityAt: Date.now(),
    userIsIdle: false,

    systemIntervalId: null,
    clockIntervalId: null,
    sessionIntervalId: null,
    activityIntervalId: null,

    cpuHistory: [],
    gpuHistory: [],
    ramHistory: [],

    imageAvailability: {
        explain: true,
        angry: true,
        cry: true,
        happy: null,
        sleep: null,
        thinking: null
    }
};


/*
=========================================================
DOM ELEMENT REFERENCES
=========================================================
*/

const elements = {
    computerStatus: document.getElementById("computer-status"),

    sidebarCpu: document.getElementById("sidebar-cpu"),
    sidebarRam: document.getElementById("sidebar-ram"),

    currentTime: document.getElementById("current-time"),
    currentDate: document.getElementById("current-date"),

    nekorinStatus: document.getElementById("nekorin-status"),
    nekorinToggle: document.getElementById("nekorin-toggle"),
    nekorinPanel: document.getElementById("nekorin-panel"),
    nekorinMessage: document.getElementById("nekorin-message"),
    nekorinImage: document.getElementById("nekorin-image"),

    cpuGauge: document.getElementById("cpu-gauge"),
    cpuValue: document.getElementById("cpu-value"),
    cpuChart: document.getElementById("cpu-chart"),

    gpuGauge: document.getElementById("gpu-gauge"),
    gpuValue: document.getElementById("gpu-value"),
    gpuChart: document.getElementById("gpu-chart"),

    ramGauge: document.getElementById("ram-gauge"),
    ramValue: document.getElementById("ram-value"),
    ramDetail: document.getElementById("ram-detail"),
    ramChart: document.getElementById("ram-chart"),

    sessionTime: document.getElementById("session-time"),

    hydrationText: document.getElementById("hydration-text"),
    waterButton: document.getElementById("water-button"),
    waterStatus: document.getElementById("water-status"),

    downloadValue: document.getElementById("download-value"),
    uploadValue: document.getElementById("upload-value"),

    storageList: document.getElementById("storage-list"),

    overviewCpu: document.getElementById("overview-cpu"),
    overviewRam: document.getElementById("overview-ram"),
    systemHealth: document.getElementById("system-health"),

    navigationButtons: Array.from(
        document.querySelectorAll(".nav-button")
    )
};


/*
=========================================================
BASIC UTILITY FUNCTIONS
=========================================================
*/

function clampNumber(value, minimum = 0, maximum = 100) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return minimum;
    }

    return Math.min(
        Math.max(numericValue, minimum),
        maximum
    );
}


function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
}


function safeText(value, fallback = "--") {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    return String(value);
}


function formatPercentage(value, fallback = "--%") {
    if (!isFiniteNumber(value)) {
        return fallback;
    }

    const safeValue = clampNumber(value);

    return `${Math.round(safeValue)}%`;
}


function formatGigabytes(value) {
    if (!isFiniteNumber(value)) {
        return "-- GB";
    }

    const numericValue = Number(value);

    return `${numericValue.toFixed(1)} GB`;
}


function formatNetworkMegabytes(value) {
    if (!isFiniteNumber(value)) {
        return "-- MB";
    }

    const numericValue = Math.max(Number(value), 0);

    if (numericValue >= 1024 * 1024) {
        return `${(numericValue / (1024 * 1024)).toFixed(2)} TB`;
    }

    if (numericValue >= 1024) {
        return `${(numericValue / 1024).toFixed(2)} GB`;
    }

    return `${numericValue.toFixed(2)} MB`;
}


function formatDuration(milliseconds) {
    const safeMilliseconds = Math.max(
        Number(milliseconds) || 0,
        0
    );

    const totalSeconds = Math.floor(
        safeMilliseconds / 1000
    );

    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor(
        (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
    ].join(":");
}


function formatMinutesRemaining(milliseconds) {
    const safeMilliseconds = Math.max(
        Number(milliseconds) || 0,
        0
    );

    const minutes = Math.ceil(
        safeMilliseconds / 60000
    );

    if (minutes <= 1) {
        return "less than 1 minute";
    }

    return `${minutes} minutes`;
}


function getRandomArrayItem(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return "";
    }

    const randomIndex = Math.floor(
        Math.random() * items.length
    );

    return items[randomIndex];
}


function getDifferentRandomMessage(items, previousMessage = "") {
    if (!Array.isArray(items) || items.length === 0) {
        return "";
    }

    if (items.length === 1) {
        return items[0];
    }

    const availableMessages = items.filter(
        (message) => message !== previousMessage
    );

    return getRandomArrayItem(
        availableMessages.length > 0
            ? availableMessages
            : items
    );
}


function setElementText(element, value) {
    if (!element) {
        return;
    }

    element.textContent = safeText(value);
}


function setElementClass(element, className, enabled) {
    if (!element || !className) {
        return;
    }

    element.classList.toggle(
        className,
        Boolean(enabled)
    );
}


/*
=========================================================
DATE AND CLOCK
=========================================================
*/

function updateClock() {
    const now = new Date();

    const timeText = new Intl.DateTimeFormat(
        "en-GB",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }
    ).format(now);

    const dateText = new Intl.DateTimeFormat(
        "en-GB",
        {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(now);

    setElementText(
        elements.currentTime,
        timeText
    );

    setElementText(
        elements.currentDate,
        dateText
    );
}


/*
=========================================================
SESSION TIMER
=========================================================
*/

function getSessionDurationMs() {
    return Date.now() -
        nekoMonitorState.applicationStartedAt;
}


function updateSessionTimer() {
    const sessionDuration =
        getSessionDurationMs();

    setElementText(
        elements.sessionTime,
        formatDuration(sessionDuration)
    );
}


/*
=========================================================
GAUGE CONTROL
=========================================================
*/

function updateGauge(
    gaugeElement,
    valueElement,
    value,
    unavailableText = "N/A"
) {
    if (!gaugeElement || !valueElement) {
        return;
    }

    if (!isFiniteNumber(value)) {
        gaugeElement.style.setProperty(
            "--value",
            "0"
        );

        valueElement.textContent =
            unavailableText;

        gaugeElement.dataset.available =
            "false";

        return;
    }

    const safeValue = clampNumber(value);

    gaugeElement.style.setProperty(
        "--value",
        safeValue.toFixed(1)
    );

    valueElement.textContent =
        formatPercentage(safeValue);

    gaugeElement.dataset.available =
        "true";
}


/*
=========================================================
CHART HISTORY CONTROL
=========================================================
*/

function addHistoryValue(historyArray, value) {
    if (!Array.isArray(historyArray)) {
        return;
    }

    const safeValue = isFiniteNumber(value)
        ? clampNumber(value)
        : 0;

    historyArray.push(safeValue);

    while (
        historyArray.length >
        NEKO_MONITOR_CONFIG.chartMaximumPoints
    ) {
        historyArray.shift();
    }
}


function fillChartHistory(historyArray, initialValue = 0) {
    if (!Array.isArray(historyArray)) {
        return;
    }

    historyArray.length = 0;

    const safeInitialValue =
        clampNumber(initialValue);

    for (
        let index = 0;
        index <
        NEKO_MONITOR_CONFIG.chartMaximumPoints;
        index += 1
    ) {
        historyArray.push(safeInitialValue);
    }
}


function renderChart(chartElement, historyArray) {
    if (
        !chartElement ||
        !Array.isArray(historyArray)
    ) {
        return;
    }

    const fragment =
        document.createDocumentFragment();

    historyArray.forEach((value) => {
        const bar =
            document.createElement("span");

        const safeValue =
            clampNumber(value);

        const minimumVisibleHeight = 8;

        const height = Math.max(
            safeValue,
            minimumVisibleHeight
        );

        bar.style.height = `${height}%`;

        bar.setAttribute(
            "aria-hidden",
            "true"
        );

        fragment.appendChild(bar);
    });

    chartElement.replaceChildren(fragment);
}


/*
=========================================================
SYSTEM API REQUEST
=========================================================
*/

async function fetchSystemData() {
    if (nekoMonitorState.isFetchingSystemData) {
        return;
    }

    nekoMonitorState.isFetchingSystemData = true;

    const isFirstSystemLoad =
        nekoMonitorState.lastSystemData === null;

    if (
        isFirstSystemLoad &&
        nekoMonitorState.nekorinModeEnabled
    ) {
        setElementText(
            elements.nekorinMessage,
            "I am checking your computer, Sultan..."
        );

        setElementText(
            elements.nekorinStatus,
            "Analyzing"
        );

        setNekorinImage("thinking");

        nekoMonitorState.currentNekorinMood =
            "thinking";

        nekoMonitorState.currentNekorinMessageType =
            "thinking";
    }

try {
    if (!window.nekoBackend) {
        await new Promise((resolve, reject) => {
            if (!window.qt?.webChannelTransport) {
                reject(new Error("Qt WebChannel is not available."));
                return;
            }

            new QWebChannel(
                window.qt.webChannelTransport,
                (channel) => {
                    window.nekoBackend =
                        channel.objects.backend;

                    resolve();
                }
            );
        });
    }

    const rawData = await new Promise((resolve) => {
        window.nekoBackend.getSystemInfo(resolve);
    });

    const data = JSON.parse(rawData);

    nekoMonitorState.lastSystemData = data;

    nekoMonitorState.lastSuccessfulUpdateAt =
        Date.now();

    nekoMonitorState.consecutiveRequestErrors = 0;

    setConnectionState(true);

    updateSystemDashboard(data);
} catch (error) {
    nekoMonitorState.consecutiveRequestErrors += 1;

    setConnectionState(false);

    handleSystemRequestError(error);
} finally {
    nekoMonitorState.isFetchingSystemData = false;
}
}

/*
=========================================================
CONNECTION STATE
=========================================================
*/

function setConnectionState(isConnected) {
    nekoMonitorState.isConnected =
        Boolean(isConnected);

    if (nekoMonitorState.isConnected) {
        setElementText(
            elements.computerStatus,
            "Online"
        );

        if (elements.computerStatus) {
            elements.computerStatus.style.color =
                "#67e8a5";
        }

        return;
    }

    setElementText(
        elements.computerStatus,
        "Offline"
    );

    if (elements.computerStatus) {
        elements.computerStatus.style.color =
            "#ff6b7a";
    }
}


function handleSystemRequestError(error) {
    console.error(
        "NekoMonitor system request failed:",
        error
    );

    setUnavailableSystemValues();

    if (
        nekoMonitorState.nekorinModeEnabled &&
        nekoMonitorState.consecutiveRequestErrors >= 2
    ) {
        setNekorinReaction(
            "connectionError",
            "cry",
            "Connection Error"
        );
    }
}


/*
=========================================================
SYSTEM DASHBOARD UPDATE
=========================================================
*/

function updateSystemDashboard(data) {
    if (!data || typeof data !== "object") {
        return;
    }

    const cpuUsage = isFiniteNumber(data.cpu_usage)
        ? clampNumber(data.cpu_usage)
        : null;

    const ramUsage = isFiniteNumber(data.ram_usage)
        ? clampNumber(data.ram_usage)
        : null;

    const gpuUsage = getGpuUsageFromData(data);

    updateCpuSection(cpuUsage);

    updateGpuSection(gpuUsage);

    updateRamSection(
        ramUsage,
        data.ram_used_gb,
        data.ram_total_gb
    );

    updateNetworkSection(
        data.download_mb,
        data.upload_mb
    );

    updateStorageSection(data.drives);

    updateSystemHealth(
        cpuUsage,
        gpuUsage,
        ramUsage
    );

    evaluateNekorinReaction(
        cpuUsage,
        gpuUsage,
        ramUsage
    );
}


function getGpuUsageFromData(data) {
    const possibleGpuValues = [
        data.gpu_usage,
        data.gpu_percent,
        data.gpu_load,
        data.gpu
    ];

    const validValue = possibleGpuValues.find(
        (value) => isFiniteNumber(value)
    );

    if (!isFiniteNumber(validValue)) {
        return null;
    }

    return clampNumber(validValue);
}


/*
=========================================================
CPU SECTION
=========================================================
*/

function updateCpuSection(cpuUsage) {
    updateGauge(
        elements.cpuGauge,
        elements.cpuValue,
        cpuUsage
    );

    const cpuText =
        formatPercentage(cpuUsage);

    setElementText(
        elements.sidebarCpu,
        cpuText
    );

    setElementText(
        elements.overviewCpu,
        cpuText
    );

    addHistoryValue(
        nekoMonitorState.cpuHistory,
        cpuUsage
    );

    renderChart(
        elements.cpuChart,
        nekoMonitorState.cpuHistory
    );
}


/*
=========================================================
GPU SECTION
=========================================================
*/

function updateGpuSection(gpuUsage) {
    updateGauge(
        elements.gpuGauge,
        elements.gpuValue,
        gpuUsage,
        "N/A"
    );

    addHistoryValue(
        nekoMonitorState.gpuHistory,
        gpuUsage
    );

    renderChart(
        elements.gpuChart,
        nekoMonitorState.gpuHistory
    );
}


/*
=========================================================
RAM SECTION
=========================================================
*/

function updateRamSection(
    ramUsage,
    ramUsedGb,
    ramTotalGb
) {
    updateGauge(
        elements.ramGauge,
        elements.ramValue,
        ramUsage
    );

    const ramText =
        formatPercentage(ramUsage);

    setElementText(
        elements.sidebarRam,
        ramText
    );

    setElementText(
        elements.overviewRam,
        ramText
    );

    if (
        isFiniteNumber(ramUsedGb) &&
        isFiniteNumber(ramTotalGb)
    ) {
        setElementText(
            elements.ramDetail,
            `${formatGigabytes(ramUsedGb)} / ${formatGigabytes(ramTotalGb)}`
        );
    } else {
        setElementText(
            elements.ramDetail,
            "-- GB / -- GB"
        );
    }

    addHistoryValue(
        nekoMonitorState.ramHistory,
        ramUsage
    );

    renderChart(
        elements.ramChart,
        nekoMonitorState.ramHistory
    );
}


/*
=========================================================
NETWORK SECTION
=========================================================
*/

function updateNetworkSection(
    downloadedMb,
    uploadedMb
) {
    setElementText(
        elements.downloadValue,
        formatNetworkMegabytes(downloadedMb)
    );

    setElementText(
        elements.uploadValue,
        formatNetworkMegabytes(uploadedMb)
    );
}


/*
=========================================================
STORAGE SECTION
=========================================================
*/

function updateStorageSection(drives) {
    if (!elements.storageList) {
        return;
    }

    if (
        !Array.isArray(drives) ||
        drives.length === 0
    ) {
        const emptyMessage =
            document.createElement("p");

        emptyMessage.className =
            "loading-text";

        emptyMessage.textContent =
            "No storage information available.";

        elements.storageList.replaceChildren(
            emptyMessage
        );

        return;
    }

    const fragment =
        document.createDocumentFragment();

    drives.forEach((drive, index) => {
        const storageItem =
            createStorageItem(drive, index);

        fragment.appendChild(storageItem);
    });

    elements.storageList.replaceChildren(
        fragment
    );
}


function createStorageItem(drive, index) {
    const driveName =
        safeText(
            drive?.drive,
            `Drive ${index + 1}`
        );

    const usedGb = isFiniteNumber(drive?.used)
        ? Number(drive.used)
        : 0;

    const totalGb = isFiniteNumber(drive?.total)
        ? Number(drive.total)
        : 0;

    const percent = isFiniteNumber(drive?.percent)
        ? clampNumber(drive.percent)
        : 0;

    const item =
        document.createElement("div");

    item.className = "storage-item";

    const topRow =
        document.createElement("div");

    topRow.className = "storage-top-row";

    const driveLabel =
        document.createElement("strong");

    driveLabel.textContent = driveName;

    const percentLabel =
        document.createElement("span");

    percentLabel.textContent =
        formatPercentage(percent);

    topRow.append(
        driveLabel,
        percentLabel
    );

    const storageDetail =
        document.createElement("p");

    storageDetail.className =
        "storage-detail";

    storageDetail.textContent =
        `${formatGigabytes(usedGb)} used of ${formatGigabytes(totalGb)}`;

    const progressTrack =
        document.createElement("div");

    progressTrack.className =
        "storage-progress";

    const progressFill =
        document.createElement("span");

    progressFill.style.width =
        `${percent}%`;

    progressTrack.appendChild(progressFill);

    item.append(
        topRow,
        storageDetail,
        progressTrack
    );

    return item;
}


/*
=========================================================
SYSTEM HEALTH
=========================================================
*/

function updateSystemHealth(
    cpuUsage,
    gpuUsage,
    ramUsage
) {
    const values = [
        cpuUsage,
        gpuUsage,
        ramUsage
    ].filter(
        (value) => isFiniteNumber(value)
    );

    if (values.length === 0) {
        setElementText(
            elements.systemHealth,
            "Unknown"
        );

        if (elements.systemHealth) {
            elements.systemHealth.className =
                "";
        }

        return;
    }

    const highestValue =
        Math.max(...values);

    let healthText = "Good";
    let healthClass = "healthy";

    if (highestValue >= 90) {
        healthText = "Critical";
        healthClass = "critical";
    } else if (highestValue >= 75) {
        healthText = "High Load";
        healthClass = "warning";
    } else if (highestValue >= 55) {
        healthText = "Busy";
        healthClass = "busy";
    }

    setElementText(
        elements.systemHealth,
        healthText
    );

    if (elements.systemHealth) {
        elements.systemHealth.className =
            healthClass;
    }
}


/*
=========================================================
UNAVAILABLE VALUES
=========================================================
*/

function setUnavailableSystemValues() {
    updateGauge(
        elements.cpuGauge,
        elements.cpuValue,
        null
    );

    updateGauge(
        elements.gpuGauge,
        elements.gpuValue,
        null,
        "N/A"
    );

    updateGauge(
        elements.ramGauge,
        elements.ramValue,
        null
    );

    setElementText(
        elements.sidebarCpu,
        "--%"
    );

    setElementText(
        elements.sidebarRam,
        "--%"
    );

    setElementText(
        elements.overviewCpu,
        "--%"
    );

    setElementText(
        elements.overviewRam,
        "--%"
    );

    setElementText(
        elements.ramDetail,
        "-- GB / -- GB"
    );

    setElementText(
        elements.downloadValue,
        "-- MB"
    );

    setElementText(
        elements.uploadValue,
        "-- MB"
    );

    setElementText(
        elements.systemHealth,
        "Offline"
    );
}


/*
=========================================================
WATER REMINDER
=========================================================
*/

function getTimeSinceLastWaterMs() {
    return Date.now() -
        nekoMonitorState.lastWaterAt;
}


function updateWaterReminder() {
    const timeSinceWater =
        getTimeSinceLastWaterMs();

    const reminderInterval =
        NEKO_MONITOR_CONFIG.waterReminderIntervalMs;

    const warningInterval =
        NEKO_MONITOR_CONFIG.waterReminderWarningMs;

    if (timeSinceWater >= reminderInterval) {
        nekoMonitorState.waterReminderActive = true;

        setElementText(
            elements.hydrationText,
            "Time to drink water, Sultan."
        );

        setElementText(
            elements.waterStatus,
            "Drink Now"
        );

        if (elements.waterStatus) {
            elements.waterStatus.style.color =
                "#38cfff";
        }

        return;
    }

    nekoMonitorState.waterReminderActive = false;

    const remainingTime =
        reminderInterval - timeSinceWater;

    if (timeSinceWater >= warningInterval) {
        setElementText(
            elements.hydrationText,
            `Water reminder in ${formatMinutesRemaining(remainingTime)}.`
        );

        setElementText(
            elements.waterStatus,
            "Soon"
        );

        return;
    }

    setElementText(
        elements.hydrationText,
        `Next reminder in ${formatMinutesRemaining(remainingTime)}.`
    );

    setElementText(
        elements.waterStatus,
        "Active"
    );

    if (elements.waterStatus) {
        elements.waterStatus.style.color = "";
    }
}


function handleWaterButtonClick() {
    nekoMonitorState.lastWaterAt =
        Date.now();

    nekoMonitorState.waterReminderActive =
        false;

    nekoMonitorState.waterReminderAcknowledged =
        true;

    updateWaterReminder();

    setNekorinReaction(
        "waterCompleted",
        "explain",
        "Hydrated"
    );

    if (elements.waterButton) {
        elements.waterButton.disabled = true;

        elements.waterButton.textContent =
            "Water completed ✓";

        window.setTimeout(() => {
            elements.waterButton.disabled =
                false;

            elements.waterButton.textContent =
                "I drank water";
        }, 1800);
    }
}


/*
=========================================================
NEKORIN REACTION EVALUATION
=========================================================
*/

function evaluateNekorinReaction(
    cpuUsage,
    gpuUsage,
    ramUsage
) {
    updateWaterReminder();

    if (!nekoMonitorState.nekorinModeEnabled) {
        return;
    }

    const sessionDuration =
        getSessionDurationMs();

    if (nekoMonitorState.waterReminderActive) {
        setNekorinReaction(
            "waterWarning",
            "explain",
            "Hydration"
        );

        return;
    }

    if (
        isFiniteNumber(cpuUsage) &&
        cpuUsage >=
            NEKO_MONITOR_CONFIG.cpuCriticalThreshold
    ) {
        setNekorinReaction(
            "cpuCritical",
            "angry",
            "CPU Critical"
        );

        return;
    }

    if (
        isFiniteNumber(ramUsage) &&
        ramUsage >=
            NEKO_MONITOR_CONFIG.ramCriticalThreshold
    ) {
        setNekorinReaction(
            "ramCritical",
            "angry",
            "RAM Critical"
        );

        return;
    }

    if (
        isFiniteNumber(gpuUsage) &&
        gpuUsage >=
            NEKO_MONITOR_CONFIG.gpuCriticalThreshold
    ) {
        setNekorinReaction(
            "gpuCritical",
            "angry",
            "GPU Critical"
        );

        return;
    }

    if (
        sessionDuration >=
        NEKO_MONITOR_CONFIG.veryLongSessionWarningMs
    ) {
        setNekorinReaction(
            "veryLongSession",
            "cry",
            "Needs Break"
        );

        return;
    }

    if (
        isFiniteNumber(cpuUsage) &&
        cpuUsage >=
            NEKO_MONITOR_CONFIG.cpuHighThreshold
    ) {
        setNekorinReaction(
            "cpuHigh",
            "angry",
            "CPU High"
        );

        return;
    }

    if (
        isFiniteNumber(ramUsage) &&
        ramUsage >=
            NEKO_MONITOR_CONFIG.ramHighThreshold
    ) {
        setNekorinReaction(
            "ramHigh",
            "angry",
            "RAM High"
        );

        return;
    }

    if (
        isFiniteNumber(gpuUsage) &&
        gpuUsage >=
            NEKO_MONITOR_CONFIG.gpuHighThreshold
    ) {
        setNekorinReaction(
            "gpuHigh",
            "angry",
            "GPU High"
        );

        return;
    }

    if (
        sessionDuration >=
        NEKO_MONITOR_CONFIG.longSessionWarningMs
    ) {
        setNekorinReaction(
            "longSession",
            "explain",
            "Take a Break"
        );

        return;
    }

    if (
        isFiniteNumber(cpuUsage) &&
        cpuUsage >=
            NEKO_MONITOR_CONFIG.cpuMediumThreshold
    ) {
        setNekorinReaction(
            "cpuMedium",
            "explain",
            "CPU Busy"
        );

        return;
    }

    if (
        isFiniteNumber(ramUsage) &&
        ramUsage >=
            NEKO_MONITOR_CONFIG.ramMediumThreshold
    ) {
        setNekorinReaction(
            "ramMedium",
            "explain",
            "RAM Busy"
        );

        return;
    }

    if (
        isFiniteNumber(gpuUsage) &&
        gpuUsage >=
            NEKO_MONITOR_CONFIG.gpuMediumThreshold
    ) {
        setNekorinReaction(
            "gpuMedium",
            "explain",
            "GPU Busy"
        );

        return;
    }

    setNekorinReaction(
        "normal",
        "explain",
        "Happy"
    );
}    
/*
=========================================================
NEKORIN REACTION DISPLAY
=========================================================
*/

function getNekorinDialogue(messageType) {
    const dialogueGroup =
        NEKORIN_DIALOGUE[messageType] ||
        NEKORIN_DIALOGUE.normal;

    return getDifferentRandomMessage(
        dialogueGroup,
        nekoMonitorState.lastNekorinMessage
    );
}


function getNekorinImagePath(mood) {
    if (
        mood &&
        NEKO_MONITOR_CONFIG.images[mood]
    ) {
        return NEKO_MONITOR_CONFIG.images[mood];
    }

    return NEKO_MONITOR_CONFIG.images.explain;
}


function setNekorinReaction(
    messageType,
    mood,
    statusText
) {
    if (!nekoMonitorState.nekorinModeEnabled) {
        return;
    }

    const safeMessageType =
        NEKORIN_DIALOGUE[messageType]
            ? messageType
            : "normal";

    const safeMood =
        NEKO_MONITOR_CONFIG.images[mood]
            ? mood
            : "explain";

    const shouldChangeMessage =
        nekoMonitorState.currentNekorinMessageType !==
        safeMessageType;

    const shouldChangeMood =
        nekoMonitorState.currentNekorinMood !==
        safeMood;

    if (shouldChangeMessage) {
        const message =
            getNekorinDialogue(safeMessageType);

        nekoMonitorState.lastNekorinMessage =
            message;

        setElementText(
            elements.nekorinMessage,
            message
        );
    }

    if (shouldChangeMood) {
        setNekorinImage(safeMood);
    }

    nekoMonitorState.currentNekorinMessageType =
        safeMessageType;

    nekoMonitorState.currentNekorinMood =
        safeMood;

    setElementText(
        elements.nekorinStatus,
        statusText || "Active"
    );
}


function setNekorinImage(mood) {
    if (!elements.nekorinImage) {
        return;
    }

    const imagePath =
        getNekorinImagePath(mood);

    const fallbackPath =
        NEKO_MONITOR_CONFIG.images.explain;

    elements.nekorinImage.onerror = () => {
        if (
            elements.nekorinImage.src.endsWith(
                fallbackPath
            )
        ) {
            return;
        }

        elements.nekorinImage.src =
            fallbackPath;

        nekoMonitorState.currentNekorinMood =
            "explain";
    };

    elements.nekorinImage.src =
        imagePath;
}


/*
=========================================================
NEKORIN MODE TOGGLE
=========================================================
*/

function updateNekorinModeInterface() {
    const enabled =
        nekoMonitorState.nekorinModeEnabled;

    setElementClass(
        elements.nekorinToggle,
        "active",
        enabled
    );

    if (elements.nekorinToggle) {
        elements.nekorinToggle.setAttribute(
            "aria-pressed",
            String(enabled)
        );
    }

    if (elements.nekorinPanel) {
        elements.nekorinPanel.style.opacity =
            enabled ? "1" : "0.55";
    }

    if (enabled) {
        setElementText(
            elements.nekorinStatus,
            "Active"
        );

        const enabledMessage =
            getNekorinDialogue("modeEnabled");

        nekoMonitorState.lastNekorinMessage =
            enabledMessage;

        setElementText(
            elements.nekorinMessage,
            enabledMessage
        );

        setNekorinImage("explain");

        return;
    }

    const disabledMessage =
        getNekorinDialogue("modeDisabled");

    nekoMonitorState.lastNekorinMessage =
        disabledMessage;

    setElementText(
        elements.nekorinMessage,
        disabledMessage
    );

    setElementText(
        elements.nekorinStatus,
        "Sleeping"
    );

    setNekorinImage("explain");
}


function handleNekorinToggle() {
    nekoMonitorState.nekorinModeEnabled =
        !nekoMonitorState.nekorinModeEnabled;

    updateNekorinModeInterface();

    if (
        nekoMonitorState.nekorinModeEnabled &&
        nekoMonitorState.lastSystemData
    ) {
        const data =
            nekoMonitorState.lastSystemData;

        evaluateNekorinReaction(
            data.cpu_usage,
            getGpuUsageFromData(data),
            data.ram_usage
        );
    }
}


/*
=========================================================
USER ACTIVITY TRACKING
=========================================================
*/

function recordUserActivity() {
    nekoMonitorState.lastUserActivityAt =
        Date.now();

    if (nekoMonitorState.userIsIdle) {
        nekoMonitorState.userIsIdle = false;

        if (
            nekoMonitorState.nekorinModeEnabled &&
            nekoMonitorState.lastSystemData
        ) {
            const data =
                nekoMonitorState.lastSystemData;

            evaluateNekorinReaction(
                data.cpu_usage,
                getGpuUsageFromData(data),
                data.ram_usage
            );
        }
    }
}


function checkUserActivity() {
    const idleThresholdMs =
        10 * 60 * 1000;

    const idleDuration =
        Date.now() -
        nekoMonitorState.lastUserActivityAt;

    if (idleDuration < idleThresholdMs) {
        nekoMonitorState.userIsIdle =
            false;

        return;
    }

    if (nekoMonitorState.userIsIdle) {
        return;
    }

    nekoMonitorState.userIsIdle = true;

    if (
        nekoMonitorState.nekorinModeEnabled &&
        !nekoMonitorState.waterReminderActive
    ) {
        const sleepImageAvailable =
            nekoMonitorState.imageAvailability.sleep ===
            true;

        setNekorinReaction(
            "normal",
            sleepImageAvailable
                ? "sleep"
                : "explain",
            "Idle"
        );

        setElementText(
            elements.nekorinMessage,
            "You have been inactive for a while, Sultan."
        );
    }
}


/*
=========================================================
NAVIGATION BUTTONS
=========================================================
*/

function handleNavigationButtonClick(event) {
    const selectedButton =
        event.currentTarget;

    elements.navigationButtons.forEach(
        (button) => {
            button.classList.remove("active");
        }
    );

    selectedButton.classList.add("active");

    const buttonText =
        selectedButton.textContent
            .replace(/\s+/g, " ")
            .trim();

    if (buttonText !== "Dashboard") {
        setNekorinTemporaryMessage(
            `${buttonText} view will be added in a future update.`,
            "explain",
            "Coming Soon",
            3500
        );
    }
}


/*
=========================================================
TEMPORARY NEKORIN MESSAGE
=========================================================
*/

function setNekorinTemporaryMessage(
    message,
    mood = "explain",
    statusText = "Active",
    durationMs = 3000
) {
    if (!nekoMonitorState.nekorinModeEnabled) {
        return;
    }

    const previousMessageType =
        nekoMonitorState.currentNekorinMessageType;

    setElementText(
        elements.nekorinMessage,
        message
    );

    setElementText(
        elements.nekorinStatus,
        statusText
    );

    setNekorinImage(mood);

    window.setTimeout(() => {
        if (!nekoMonitorState.nekorinModeEnabled) {
            return;
        }

        if (nekoMonitorState.lastSystemData) {
            const data =
                nekoMonitorState.lastSystemData;

            evaluateNekorinReaction(
                data.cpu_usage,
                getGpuUsageFromData(data),
                data.ram_usage
            );

            return;
        }

        setNekorinReaction(
            previousMessageType,
            "explain",
            "Active"
        );
    }, durationMs);
}


/*
=========================================================
OPTIONAL IMAGE AVAILABILITY CHECK
=========================================================
*/

function checkImageAvailability(
    imageName,
    imagePath
) {
    return new Promise((resolve) => {
        const image =
            new Image();

        image.onload = () => {
            nekoMonitorState.imageAvailability[
                imageName
            ] = true;

            resolve(true);
        };

        image.onerror = () => {
            nekoMonitorState.imageAvailability[
                imageName
            ] = false;

            resolve(false);
        };

        image.src =
            `${imagePath}?check=${Date.now()}`;
    });
}


async function checkOptionalNekorinImages() {
    const optionalImages = [
        ["happy", NEKO_MONITOR_CONFIG.images.happy],
        ["sleep", NEKO_MONITOR_CONFIG.images.sleep],
        [
            "thinking",
            NEKO_MONITOR_CONFIG.images.thinking
        ]
    ];

    await Promise.all(
        optionalImages.map(
            ([imageName, imagePath]) =>
                checkImageAvailability(
                    imageName,
                    imagePath
                )
        )
    );
}


/*
=========================================================
INITIAL CHART SETUP
=========================================================
*/

function initializeCharts() {
    fillChartHistory(
        nekoMonitorState.cpuHistory,
        0
    );

    fillChartHistory(
        nekoMonitorState.gpuHistory,
        0
    );

    fillChartHistory(
        nekoMonitorState.ramHistory,
        0
    );

    renderChart(
        elements.cpuChart,
        nekoMonitorState.cpuHistory
    );

    renderChart(
        elements.gpuChart,
        nekoMonitorState.gpuHistory
    );

    renderChart(
        elements.ramChart,
        nekoMonitorState.ramHistory
    );
}


/*
=========================================================
EVENT LISTENERS
=========================================================
*/

function registerEventListeners() {
    if (elements.waterButton) {
        elements.waterButton.addEventListener(
            "click",
            handleWaterButtonClick
        );
    }

    if (elements.nekorinToggle) {
        elements.nekorinToggle.addEventListener(
            "click",
            handleNekorinToggle
        );
    }

    elements.navigationButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                handleNavigationButtonClick
            );
        }
    );

    const activityEvents = [
        "mousemove",
        "mousedown",
        "keydown",
        "touchstart",
        "scroll"
    ];

    activityEvents.forEach((eventName) => {
        window.addEventListener(
            eventName,
            recordUserActivity,
            {
                passive: true
            }
        );
    });

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    window.addEventListener(
        "online",
        handleBrowserOnline
    );

    window.addEventListener(
        "offline",
        handleBrowserOffline
    );

    window.addEventListener(
        "beforeunload",
        stopApplicationIntervals
    );
}


function handleVisibilityChange() {
    if (document.hidden) {
        return;
    }

    recordUserActivity();
    updateClock();
    updateSessionTimer();
    fetchSystemData();
}


function handleBrowserOnline() {
    setConnectionState(true);
    fetchSystemData();
}


function handleBrowserOffline() {
    setConnectionState(false);

    if (nekoMonitorState.nekorinModeEnabled) {
        setNekorinReaction(
            "connectionError",
            "cry",
            "Offline"
        );
    }
}


/*
=========================================================
APPLICATION INTERVALS
=========================================================
*/

function startApplicationIntervals() {
    stopApplicationIntervals();

    nekoMonitorState.systemIntervalId =
        window.setInterval(
            fetchSystemData,
            NEKO_MONITOR_CONFIG
                .systemRefreshIntervalMs
        );

    nekoMonitorState.clockIntervalId =
        window.setInterval(
            updateClock,
            NEKO_MONITOR_CONFIG
                .clockRefreshIntervalMs
        );

    nekoMonitorState.sessionIntervalId =
        window.setInterval(() => {
            updateSessionTimer();
            updateWaterReminder();
        }, NEKO_MONITOR_CONFIG.sessionRefreshIntervalMs);

    nekoMonitorState.activityIntervalId =
        window.setInterval(
            checkUserActivity,
            60 * 1000
        );
}


function stopApplicationIntervals() {
    const intervalIds = [
        nekoMonitorState.systemIntervalId,
        nekoMonitorState.clockIntervalId,
        nekoMonitorState.sessionIntervalId,
        nekoMonitorState.activityIntervalId
    ];

    intervalIds.forEach((intervalId) => {
        if (intervalId !== null) {
            window.clearInterval(intervalId);
        }
    });

    nekoMonitorState.systemIntervalId = null;
    nekoMonitorState.clockIntervalId = null;
    nekoMonitorState.sessionIntervalId = null;
    nekoMonitorState.activityIntervalId = null;
}


/*
=========================================================
INITIAL APPLICATION STATE
=========================================================
*/

function initializeInterface() {
    setConnectionState(false);

    updateClock();
    updateSessionTimer();
    updateWaterReminder();
    initializeCharts();
    updateNekorinModeInterface();

    setElementText(
        elements.nekorinMessage,
        getNekorinDialogue("welcome")
    );

    setElementText(
        elements.nekorinStatus,
        "Starting"
    );

    setNekorinImage("explain");
}


/*
=========================================================
APPLICATION STARTUP
=========================================================
*/

async function initializeNekoMonitor() {
    initializeInterface();

    registerEventListeners();

    checkOptionalNekorinImages();

    await fetchSystemData();

    startApplicationIntervals();

    if (
        nekoMonitorState.nekorinModeEnabled &&
        nekoMonitorState.isConnected
    ) {
        setNekorinTemporaryMessage(
            "NekoMonitor Lite is ready, Sultan.",
            "explain",
            "Ready",
            2500
        );
    }
}


/*
=========================================================
START AFTER THE HTML IS READY
=========================================================
*/

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeNekoMonitor,
        {
            once: true
        }
    );
} else {
    initializeNekoMonitor();
}


/*
=========================================================
NEKOMONITOR LITE
END OF static/app.js
=========================================================
*/