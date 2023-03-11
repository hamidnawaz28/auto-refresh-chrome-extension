// popup.js

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

  // Handle fix value event
  document
    .querySelector("#intervalValue")
    .addEventListener("change", async (e) => {
      const tabs = await chrome.tabs.query({ active: true });
      const activeTabId = tabs[0].id;
      const prevData = await getPageData(activeTabId);
      const intervalValue = e.target.value;
      const refreshData = {
        ...prevData,
        intervalValue,
      };
      await alterPageData(activeTabId, refreshData);
      updateDom(refreshData);
    });
});

// Dom refresh handle
const updateDom = (data) => {
  const intervalValueRef = document.getElementById("intervalValue");
  intervalValueRef.value = data.intervalValue;

  const startButton = document.getElementById("start");
  const stopButton = document.getElementById("stop");

  if (data.running) {
    stopButton.removeAttribute("disabled");
    startButton.setAttribute("disabled", "true");
  } else {
    startButton.removeAttribute("disabled");
    stopButton.setAttribute("disabled", "true");
  }
};
