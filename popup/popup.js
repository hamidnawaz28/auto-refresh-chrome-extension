// popup.js
const intervalPreferences = ["seconds", "minutes", "hours"];
const valuePreferences = ["fix", "random"];
const alterPageData = async (tabId, newData) => {
  const chromeStorage = await chrome.storage.sync.get();
  let autoRefreshData = chromeStorage?.autoRefreshData || [];
  autoRefreshData = autoRefreshData.map((data) => {
    if (data.tabId == tabId) {
      return {
        ...data,
        ...newData,
      };
    }
    return data;
  });

  const pageData = {
    autoRefreshData,
  };
  await chrome.storage.sync.set(pageData);
};

const getPageData = async (tabId) => {
  const data = await chrome.storage.sync.get();
  const autoRefreshData = data?.autoRefreshData || [];
  return autoRefreshData.find((data) => data.tabId == tabId);
};

// set batch text :await chrome.action.setBadgeText({ text: "Hamid",tabId:1 });
document.addEventListener("DOMContentLoaded", async () => {
  const tabs = await chrome.tabs.query({ active: true });
  const activeTabId = tabs[0].id;
  const activeTabData = await getPageData(activeTabId);
  updateDom(activeTabData);

  const startButton = document.getElementById("start");
  const stopButton = document.getElementById("stop");

  startButton.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ action: "start" });
    stopButton.removeAttribute("disabled");
    startButton.setAttribute("disabled", "true");
  });

  stopButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stop" });
    startButton.removeAttribute("disabled");
    stopButton.setAttribute("disabled", "true");
  });

  // Handle interval preference event
  document.querySelectorAll("#interval-preference > input").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const tabs = await chrome.tabs.query({ active: true });
      const activeTabId = tabs[0].id;
      const prevData = await getPageData(activeTabId);
      const intervalPreference = e.target.getAttribute("id");
      const refreshData = {
        ...prevData,
        intervalPreference,
      };
      await alterPageData(activeTabId, refreshData);
      updateDom(refreshData);
    });
  });

  // Handle interval value preference event
  document
    .querySelectorAll(".interval-item input[type='radio']")
    .forEach((el) => {
      el.addEventListener("click", async (e) => {
        const tabs = await chrome.tabs.query({ active: true });
        const activeTabId = tabs[0].id;
        const prevData = await getPageData(activeTabId);
        const valuePreference = e.target.getAttribute("id");
        const refreshData = {
          ...prevData,
          valuePreference,
        };
        await alterPageData(activeTabId, refreshData);
        updateDom(refreshData);
      });
    });

  // Handle fix value event
  document.querySelector("#fixValue").addEventListener("change", async (e) => {
    const tabs = await chrome.tabs.query({ active: true });
    const activeTabId = tabs[0].id;
    const prevData = await getPageData(activeTabId);
    const fixValue = e.target.value;
    const refreshData = {
      ...prevData,
      fixValue,
    };
    await alterPageData(activeTabId, refreshData);
    updateDom(refreshData);
  });

  // Randrom from change event
  document
    .querySelector("#randomValueFrom")
    .addEventListener("change", async (e) => {
      const tabs = await chrome.tabs.query({ active: true });
      const activeTabId = tabs[0].id;
      const prevData = await getPageData(activeTabId);
      const randomValueFrom = e.target.value;
      const refreshData = {
        ...prevData,
        fromRandom: randomValueFrom,
      };
      await alterPageData(activeTabId, refreshData);
      updateDom(refreshData);
    });

  // Randrom to change event
  document
    .querySelector("#randomValueTo")
    .addEventListener("change", async (e) => {
      const tabs = await chrome.tabs.query({ active: true });
      const activeTabId = tabs[0].id;
      const prevData = await getPageData(activeTabId);
      const randomValueTo = e.target.value;
      const refreshData = {
        ...prevData,
        toRandom: randomValueTo,
      };
      await alterPageData(activeTabId, refreshData);
      updateDom(refreshData);
    });
});

// Dom refresh handle
const updateDom = (data) => {
  const fixValueRef = document.getElementById("fixValue");
  const randomValueFromRef = document.getElementById("randomValueFrom");
  const randomValueToRef = document.getElementById("randomValueTo");
  const startButton = document.getElementById("start");
  const stopButton = document.getElementById("stop");
  fixValueRef.value = data.fixValue;
  randomValueFromRef.value = data.fromRandom;
  randomValueToRef.value = data.toRandom;
  document.querySelector(
    `#interval-preference > input[id="${data.intervalPreference}"]`
  ).checked = true;
  if (data.valuePreference == "fix") {
    document.querySelector('input[id="fix"]').checked = true;
    randomValueFromRef.setAttribute("disabled", "true");
    randomValueToRef.setAttribute("disabled", "true");
    fixValueRef.removeAttribute("disabled");
  } else {
    document.querySelector('input[id="random"]').checked = true;
    randomValueFromRef.removeAttribute("disabled");
    randomValueToRef.removeAttribute("disabled");
    fixValueRef.setAttribute("disabled", "true");
  }
  if (data.running) {
    stopButton.removeAttribute("disabled");
    startButton.setAttribute("disabled", "true");
  } else {
    startButton.removeAttribute("disabled");
    stopButton.setAttribute("disabled", "true");
  }
};
