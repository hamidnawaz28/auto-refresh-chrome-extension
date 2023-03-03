const batchRefreshTime = 1000;
chrome.runtime.onMessage.addListener(async (request) => {
  const tabs = await chrome.tabs.query({ active: true });
  const activeTabId = tabs[0].id;
  const activeTabData = await getPageData(activeTabId);

  const { intervalValue, intervalObject, timeRef, intervalPreference } =
    activeTabData;

  if (request.action === "start") {
    // handle fix inputs
    let startTime = intervalValue;

    // Refresh batch value
    const timeRef = setInterval(async function () {
      startTime = startTime - 1;
      await chrome.action.setBadgeText({
        text: `${startTime}s`,
        tabId: activeTabId,
      });
      if (startTime == 0) startTime = intervalValue;
    }, batchRefreshTime);

    // Reload pages
    const intervalRef = setInterval(async () => {
      chrome.tabs.reload(activeTabId);
    }, startTime * 1000);

    // Change tab state
    await alterPageData(activeTabId, {
      running: true,
      intervalObject: intervalRef,
      timeRef,
    });
  } else if (request.action === "stop") {
    // clean intervals and reset states of a tab
    clearInterval(intervalObject);
    clearInterval(timeRef);

    // Alter tab state
    await alterPageData(activeTabId, {
      running: false,
      intervalObject: null,
      timeRef: null,
    });
    // Clear batch text
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
  let refreshData = {
    tabId: tab.id,
    running: false,
    intervalValue: 10,
    intervalObject: null,
    timeRef: null,
  };

  const prevData = await chrome.storage.sync.get();
  const prevPagesData = prevData?.autoRefreshData || [];
  const pageData = {
    autoRefreshData: [...prevPagesData, { ...refreshData }],
  };
  await chrome.storage.sync.set(pageData);
});

// Event fired when a tab is closed
chrome.tabs.onRemoved.addListener(async (tab) => {
  const prevData = await chrome.storage.sync.get();
  const prevPagesData = prevData?.autoRefreshData || [];
  const filteredData = prevPagesData.filter((data) => data.tabId != tab);
  const pageData = {
    autoRefreshData: [...filteredData],
  };
  await chrome.storage.sync.set(pageData);
});
