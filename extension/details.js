document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("details-container");

  const savedData = localStorage.getItem("news_veracity_details");
  const highlightedText = localStorage.getItem("highlighted_text");

  if (!savedData) {
    container.innerHTML = "<p>⚠️ No details found. Please try again by scanning text again.</p>";
    return;
  }

  const { verdict, confidence, claims } = JSON.parse(savedData);

  let claimsHTML = "";
  if (claims.length > 0) {
    claimsHTML =
      "<ul>" +
      claims.map(c => `<li><b>${c.reviewer || "Unknown"}</b>: ${c.text}</li>`).join("") +
      "</ul>";
  } else {
    claimsHTML = "<p>⚠️ No relevant fact-checks found.</p>";
  }

  container.innerHTML = `
    <h2>🧠 NLP Verdict</h2>
    <p><b>${verdict}</b> (${confidence})</p>
    <h2>🔍 Fact Check Results</h2>
    ${claimsHTML}
    <br>
    <h2>📰 Related News Articles</h2>
    <p>Loading related articles...</p>
    <div id="related-articles"></div>
    <br>
    <button onclick="window.close()">Close</button>
  `;

  // ✅ Related articles section
  const query = encodeURIComponent(highlightedText || "news");
  const API_KEY = "7576a1cd37a14c21bb427035618175ac";
  const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const articlesDiv = document.getElementById("related-articles");

    if (data.status === "error") {
      articlesDiv.innerHTML = `<p>🚫 Error: ${data.message}</p>`;
      return;
    }

    if (data.articles && data.articles.length > 0) {
      let articlesHTML = "<ul>";
      data.articles.forEach(article => {
        articlesHTML += `
          <li>
            <b><a href="${article.url}" target="_blank">${article.title}</a></b><br>
            ${article.description || ""}
            <br>
            ${article.urlToImage ? `<img src="${article.urlToImage}" width="100%" style="margin-top:8px;border-radius:6px;">` : ""}
            <div style="font-size:13px;color:#666;">${article.source.name}</div>
            <div style="font-size:12px;color:#888;">Published on: ${new Date(article.publishedAt).toLocaleString()}</div>
            <br>
          </li>
        `;
      });
      articlesHTML += "</ul>";
      articlesDiv.innerHTML = articlesHTML;
    } else {
      articlesDiv.innerHTML = "<p>❌ No related articles found.</p>";
    }
  } catch (err) {
    console.error("Error fetching articles:", err);
    document.getElementById("related-articles").innerHTML = "<p>❌ Failed to load related articles.</p>";
  }

  // 🧹 Optional cleanup
  localStorage.removeItem("highlighted_text");
  localStorage.removeItem("news_veracity_details");
});
