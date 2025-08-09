document.getElementById("checkBtn").addEventListener("click", () => { 
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: () => window.getSelection().toString()
      },
      (results) => {
        const text = results[0].result;
        const statusEl = document.getElementById("status");

        if (!text) {
          statusEl.innerText = "⚠️ Please highlight some text.";
          return;
        }

        statusEl.innerHTML = `<span class="loading">🔍 Checking...</span>`;

        // Save highlighted text for use in details.html
        localStorage.setItem("highlighted_text", text);

        // Step 1: Call /check endpoint
        fetch("http://127.0.0.1:5000/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        })
          .then((res) => res.json())
          .then((checkData) => {
            // Step 2: Call /fact-check endpoint
            fetch("http://127.0.0.1:5000/fact-check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: text })
            })
              .then((res) => res.json())
              .then((factData) => {
                let claimResults = "";
                if (factData.claims && factData.claims.length > 0) {
                  claimResults = `<ul>` + factData.claims.slice(0, 3).map(c =>
                    `<li>🗞️ <b>${c.reviewer || "Unknown"}</b>: ${c.text}</li>`
                  ).join("") + `</ul>`;
                } else {
                  claimResults = "⚠️ No relevant fact-checks found.";
                }

                // Show final output with link
                statusEl.innerHTML = `
                  <b>🧠 NLP Verdict:</b> ${checkData.verdict} (${checkData.confidence})<br><br>
                  <b>🔍 Fact Check Results:</b><br>${claimResults}<br><br>
                  <a href="details.html" target="_blank">🔗 Show more</a>
                `;

                // Save results for details.html
                localStorage.setItem("news_veracity_details", JSON.stringify({
                  verdict: checkData.verdict,
                  confidence: checkData.confidence,
                  claims: factData.claims || []
                }));
              });
          })
          .catch(() => {
            statusEl.innerText = "❌ Error connecting to server.";
          });
      }
    );
  });
});
