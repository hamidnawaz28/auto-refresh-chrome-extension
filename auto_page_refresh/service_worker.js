const batchRefreshTime = 1000;
chrome.runtime.onMessage.addListener(async (request) => {
  const tabs = await chrome.tabs.query({ active: true });
  const activeTabId = tabs[0].id;
  const activeTabData = await getPageData(activeTabId);

  const {
    fixValue,
    valuePreference,
    fromRandom,
    toRandom,
    intervalObject,
    timeRef,
    intervalPreference,
  } = activeTabData;

  if (request.action === "start") {
    // Start reloading, based on fix and random input
    if (valuePreference == "fix") {
      // handle fix inputs
      let startTime = timeInSeconds(intervalPreference, fixValue);

      // Refresh batch value
      const timeRef = setInterval(async function () {
        startTime = startTime - 1000;
        await chrome.action.setBadgeText({
          text: timeViewer(startTime),
          tabId: activeTabId,
        });
        if (startTime == 0)
          startTime = timeInSeconds(intervalPreference, fixValue);
      }, batchRefreshTime);

      // Reload pages
      const intervalRef = setInterval(async () => {
        chrome.tabs.reload(activeTabId);
      }, startTime);

      // Change tab state
      await alterPageData(activeTabId, {
        running: true,
        intervalObject: intervalRef,
        timeRef,
      });
    } else {
      // recursive function that will generate random number until stopped
      const runInterval = async () => {
        // Generate a random number in range
        const randomNumber = randomBetween(
          Number(fromRandom),
          Number(toRandom)
        );
        let startTime = timeInSeconds(intervalPreference, randomNumber);

        // Refresh the batch after 1 sec
        const timeRef = setInterval(async () => {
          startTime = startTime - 1000;
          await chrome.action.setBadgeText({
            text: timeViewer(startTime),
            tabId: activeTabId,
          });
          if (startTime == 0) startTime = fixValue;
        }, batchRefreshTime);

        // Reload the page
        const intervalRef = setTimeout(async () => {
          await chrome.tabs.reload(activeTabId);
          clearInterval(timeRef);
          await runInterval();
        }, startTime);

        // Alter tab state
        await alterPageData(activeTabId, {
          running: true,
          intervalObject: intervalRef,
          timeRef,
        });
      };
      await runInterval();
    }
  } else if (request.action === "stop") {
    // clean intervals and reset states of a tab
    clearInterval(intervalObject);
    clearTimeout(intervalObject);
    clearInterval(timeRef);

    // Alter tab state
    await alterPageData(activeTabId, {
      running: false,
      intervalObject: null,
      timeRef: null,
    });
    // Clear batch
    await chrome.action.setBadgeText({
      text: "",
      tabId: activeTabId,
    });
  }
});

// Change pageinformation
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

// Event fired when a tab is added
chrome.tabs.onCreated.addListener(async (tab) => {
  await updateTabsStorage(tab.id);
});

// When first time extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    await updateTabsStorage(tab.id);
  }
});

// Event fired when a tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await updateTabsStorage(tabId, false);
});

const updateTabsStorage = async (tabId, add = true) => {
  const refreshData = {
    tabId,
    running: false,
    intervalPreference: "seconds",
    valuePreference: "fix",
    fixValue: 10,
    fromRandom: 10,
    toRandom: 20,
    intervalObject: null,
    timeRef: null,
    initiationTime: 0,
  };
  const prevData = await chrome.storage.sync.get();
  const prevPagesData = prevData?.autoRefreshData || [];
  let pageData = {};
  if (add) {
    pageData = {
      autoRefreshData: [...prevPagesData, { ...refreshData }],
    };
  } else {
    const filteredData = prevPagesData.filter((data) => data.tabId != tabId);
    pageData = {
      autoRefreshData: [...filteredData],
    };
  }
  await chrome.storage.sync.set(pageData);
};

// Generate a random number between min and max
const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Show user time in seconds, m:s and hours
const timeViewer = (seconds) => {
  seconds = seconds / 1000;
  if (seconds == 0) return "";
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) {
    const remainder = seconds % 60;
    const minutes = (seconds - remainder) / 60;
    return `${minutes}:${remainder < 10 ? "0" : ""}${remainder}`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `${hours}h`;
  }
};

// Convert milli-seconds to seconds, minutes and hours
const timeInSeconds = (intervalPreference, time) => {
  const conversion = {
    seconds: time * 1000,
    minutes: time * 60 * 1000,
    hours: time * 3600 * 1000,
  };
  return conversion[intervalPreference];
};
