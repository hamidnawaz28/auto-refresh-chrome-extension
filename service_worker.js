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
    if (valuePreference == "fix") {
      let startTime = timeInSeconds(intervalPreference, fixValue);
      const timeRef = setInterval(async function () {
        startTime = startTime - 1000;
        await chrome.action.setBadgeText({
          text: timeViewer(startTime),
          tabId: activeTabId,
        });
        if (startTime == 0)
          startTime = timeInSeconds(intervalPreference, fixValue);
      }, batchRefreshTime);

      const intervalRef = setInterval(async () => {
        chrome.tabs.reload(activeTabId);
      }, startTime);

      await alterPageData(activeTabId, {
        running: true,
        intervalObject: intervalRef,
        timeRef,
      });
    } else {
      const runInterval = async () => {
        const randomNumber = randomBetween(
          Number(fromRandom),
          Number(toRandom)
        );
        let startTime = timeInSeconds(intervalPreference, randomNumber);

        const timeRef = setInterval(async () => {
          startTime = startTime - 1000;
          await chrome.action.setBadgeText({
            text: timeViewer(startTime),
            tabId: activeTabId,
          });
          if (startTime == 0) startTime = fixValue;
        }, batchRefreshTime);

        const intervalRef = setTimeout(async () => {
          await chrome.tabs.reload(activeTabId);
          clearInterval(timeRef);
          await runInterval();
        }, startTime);

        await alterPageData(activeTabId, {
          running: true,
          intervalObject: intervalRef,
          timeRef,
        });
      };
      await runInterval();
    }
  } else if (request.action === "stop") {
    clearInterval(intervalObject);
    clearTimeout(intervalObject);
    clearInterval(timeRef);

    await alterPageData(activeTabId, {
      running: false,
      intervalObject: null,
      timeRef: null,
    });

    await chrome.action.setBadgeText({
      text: "",
      tabId: activeTabId,
    });
  }
});

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

chrome.tabs.onCreated.addListener(async (tab) => {
  let refreshData = {
    tabId: tab.id,
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
  const pageData = {
    autoRefreshData: [...prevPagesData, { ...refreshData }],
  };
  await chrome.storage.sync.set(pageData);
});

chrome.tabs.onRemoved.addListener(async (tab) => {
  const prevData = await chrome.storage.sync.get();
  const prevPagesData = prevData?.autoRefreshData || [];
  const filteredData = prevPagesData.filter((data) => data.tabId != tab);
  const pageData = {
    autoRefreshData: [...filteredData],
  };
  await chrome.storage.sync.set(pageData);
});

const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

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

const timeInSeconds = (intervalPreference, time) => {
  const conversion = {
    seconds: time * 1000,
    minutes: time * 60 * 1000,
    hours: time * 3600 * 1000,
  };
  return conversion[intervalPreference];
};
