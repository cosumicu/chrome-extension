const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

document.addEventListener("DOMContentLoaded", () => {
  let subreddit = "";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let url = tabs[0].url;
    if (url.includes("reddit.com/r/")) {
      subreddit = url.split("/r/")[1].split("/")[0];
      document.getElementById("subreddit").textContent = "r/" + subreddit;
    } else {
      document.getElementById("subreddit").textContent = "Not a subreddit page";
    }
  });

  document.getElementById("analyzeBtn").addEventListener("click", async () => {
    if (!subreddit) return alert("No subreddit detected!");
    document.getElementById("results").textContent = "Loading...";
    const posts = await getPosts(subreddit);
    const bestTimes = analyze(posts);
    displayResults(bestTimes);
  });
});

// Get posts from Reddit
async function getPosts(subreddit) {
  let posts = [];
  let after = null;

  for (let i = 0; i < 5; i++) {
    let url = `https://www.reddit.com/r/${subreddit}/top.json?t=month&limit=100${
      after ? "&after=" + after : ""
    }`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await res.json();
    posts = posts.concat(data.data.children);
    after = data.data.after;
    if (!after) break;
  }

  return posts;
}

// Analyze posts to find best day/hour
function analyze(posts) {
  let stats = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ scoreTotal: 0, count: 0 }))
  );

  posts.forEach((post) => {
    const p = post.data;
    const dt = new Date(p.created_utc * 1000);
    const day = dt.getUTCDay() === 0 ? 6 : dt.getUTCDay() - 1; // Adjust Sunday=6
    const hour = dt.getUTCHours();
    stats[day][hour].scoreTotal += p.score;
    stats[day][hour].count += 1;
  });

  let results = [];
  stats.forEach((hours, day) => {
    let bestHour = 0,
      bestScore = 0;
    hours.forEach((h, hour) => {
      const avg = h.count ? h.scoreTotal / h.count : 0;
      if (avg > bestScore) {
        bestScore = avg;
        bestHour = hour;
      }
    });
    results.push({ day: DAY_NAMES[day], bestHour, bestScore });
  });

  return results;
}

function displayResults(bestTimes) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  bestTimes.forEach((r) => {
    const div = document.createElement("div");
    div.className = "day";
    div.textContent = `${r.day}: Best Hour = ${
      r.bestHour
    }, Avg Score = ${r.bestScore.toFixed(2)}`;
    container.appendChild(div);
  });
}
