document.addEventListener("DOMContentLoaded", () => {
  const stayLoggedIn = localStorage.getItem("stayLoggedIn") === "true";
  const persistenceMode = stayLoggedIn ? window.browserLocalPersistence : window.browserSessionPersistence;
  window.setPersistence(window.auth, persistenceMode).then(() => {
    console.log("✅ Persistence set:", stayLoggedIn ? "Local" : "Session");
  });
  const loginSection = document.getElementById("login-screen");  
  const homeScreen = document.getElementById("home-screen");
  const guestNotice = document.createElement("div");
  guestNotice.id = "guestNotice";
  guestNotice.style.cssText =
    "margin:12px 0;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:14px;background:#111;color:#ddd;display:none;";
  guestNotice.textContent = "You’re browsing builds. Sign in to favorite or post your own.";
  homeScreen.prepend(guestNotice);

  const guestAuthBtn = document.createElement("button");
  guestAuthBtn.id = "guestAuthBtn";
  guestAuthBtn.textContent = "🔑 Login / Register";
  guestAuthBtn.style.cssText =
    "display:none;margin:8px 0;padding:6px 12px;border:none;border-radius:6px;background:#444;color:#fff;cursor:pointer;";
  guestAuthBtn.addEventListener("click", () => {
    homeScreen.style.display = "none";
    loginSection.style.display = "block";
  });
  homeScreen.prepend(guestAuthBtn);
  const buildSelector = document.getElementById("buildSelector");
  const buildList = document.getElementById("buildList");
  const submitBtn = document.getElementById("submitBuild");
  const newName = document.getElementById("newName");
  const newSteps = document.getElementById("newSteps");
  const statusMsg = document.getElementById("statusMsg");
  const newClan = document.getElementById("newClan");
  const clanFilter = document.getElementById("clanFilter");
  const emailInput = document.getElementById("loginIdentifier");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const authStatus = document.getElementById("authStatus");
  const logoutBtn = document.getElementById("logoutBtn");
  const tabContents = document.querySelectorAll(".tab-content");
  const yearlyContainer = document.getElementById("yearly-builds");
  const pathSelector = document.getElementById("selectedPath");
  const lorePicker = document.getElementById("lorePicker");
  const loreJsonMode = document.getElementById("loreJsonMode");
  const loreTreeMode = document.getElementById("loreTreeMode");
  const loreTreeFrame = document.getElementById("loreTreeFrame");
  const refreshBuildsBtn = document.getElementById("refreshBuildsBtn");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const profileBuildsContainer = document.getElementById("profileBuildsContainer");
  const closeBtn = document.getElementById('closeAppBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
    try {
      ipcRenderer.send('request-app-close');
    } catch (e) {
      try { window.close(); } catch {}
    }
  });
  const { ipcRenderer } = require("electron");
  const fs = require("fs");
  const path = require("path");
  const dataDir = path.join(__dirname, "data");

  const {
    db,
    collection,
    getDocs,
    getDoc,
    setDoc, 
    addDoc,
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateDoc,
    query,
    where,
    deleteDoc,
    doc
  } = window;
  const buildTabBtn   = document.getElementById("buildTabBtn");
  const postTabBtn    = document.getElementById("postTabBtn");
  const profileTabBtn = document.getElementById("profileTabBtn");
  buildTabBtn.addEventListener("click", () => showTab("build-tab"));
  postTabBtn.addEventListener("click", () => showTab("post-tab"));
  profileTabBtn.addEventListener("click", () => showTab("profile-tab"));

  let buildData = {};
  let buildSubmitCooldown = false;
  let loreOrderState = [];

  function enc(v) { return encodeURIComponent(String(v)); }
  function dec(v) { try { return decodeURIComponent(String(v)); } catch { return v; } }

  ipcRenderer.on("update-available", () => {
    const container = document.getElementById("updateProgressContainer");
    const progressBar = document.getElementById("updateProgressBar");
    const progressText = document.getElementById("updateProgressText");
    if (!container || !progressBar || !progressText) return;
    container.style.display = "block";
    progressBar.value = 0;
    progressText.textContent = "0%";
  });

  ipcRenderer.on("download-progress", (_, progressObj) => {
    const container = document.getElementById("updateProgressContainer");
    const progressBar = document.getElementById("updateProgressBar");
    const progressText = document.getElementById("updateProgressText");
    if (!container || !progressBar || !progressText) return;
    container.style.display = "block";
    const percent = Math.round(progressObj.percent);
    progressBar.value = percent;
    progressText.textContent = `${percent}%`;
  });

  ipcRenderer.on("update-downloaded", () => {
    const container = document.getElementById("updateProgressContainer");
    if (container) container.style.display = "none";
  });

  loreJsonMode.addEventListener("change", () => {
    if (loreJsonMode.checked) {
      lorePicker.style.display = "block";
      loreTreeFrame.style.display = "none";
    }
  });

  loreTreeMode.addEventListener("change", () => {
    if (loreTreeMode.checked) {
      lorePicker.style.display = "none";
      loreTreeFrame.style.display = "block";
    }
  });

  let militaryPaths = {};
  let clanLore = {};
  try {
    militaryPaths = JSON.parse(fs.readFileSync(path.resolve(dataDir, "militarypath.json")));
  } catch (e) {
    console.error("militarypath.json load error", e);
  }
  try {
    clanLore = JSON.parse(fs.readFileSync(path.resolve(dataDir, "lore.json")));
  } catch (e) {
    console.error("lore.json load error", e);
  }

  newClan.addEventListener("change", () => {
    const clan = newClan.value;
    if (!clan) return;
    pathSelector.innerHTML = "";
    lorePicker.innerHTML = "";
    loreOrderState = [];
    const paths = militaryPaths[clan]?.military_paths || [];
    for (const p of paths) {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      pathSelector.appendChild(opt);
    }
    let availableLore = [];
    const entry = clanLore[clan];
    if (Array.isArray(entry)) {
      availableLore = entry;
    } else if (entry && typeof entry === "object") {
      availableLore = [
        ...(entry.has_common_lore || []),
        ...(entry.unique_lore || [])
      ];
    }
    for (const lore of availableLore) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lore-button";
      btn.textContent = lore;
      btn.dataset.lore = lore;
      btn.dataset.order = ""; 
      btn.addEventListener("click", () => {
        const idx = loreOrderState.findIndex(x => x.lore === lore);
        if (idx === -1) {
          loreOrderState.push({ lore, order: loreOrderState.length + 1 });
        } else {
          loreOrderState.splice(idx, 1);
          loreOrderState = loreOrderState.map((x, i) => ({ ...x, order: i + 1 }));
        }
        document.querySelectorAll(".lore-button").forEach(b => {
          const match = loreOrderState.find(x => x.lore === b.dataset.lore);
          b.dataset.order = match ? String(match.order) : "";
          b.textContent = match ? `${match.order}. ${b.dataset.lore}` : b.dataset.lore;
        });
      });

      lorePicker.appendChild(btn);
    }
  });
  function showTab(tabId) {
    tabContents.forEach(div => { div.style.display = "none"; });
    const tab = document.getElementById(tabId);
    if (tab) tab.style.display = "block";
  }

  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("button[data-tab]");
    if (tabBtn) {
      showTab(tabBtn.getAttribute("data-tab"));
      return;
    }
    const actionBtn = e.target.closest("button[data-action]");
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const name = dec(actionBtn.dataset.name || "");
      if (action === "upvote" && name) upvoteBuild(name);
      if (action === "view" && name) openBuildInWindow(name);
      return;
    }
    const closeBtn = e.target.closest(".js-close");
    if (closeBtn) {
      ipcRenderer.send("request-app-close");
      return;
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      loginSection.style.display = "none";
      homeScreen.style.display = "block";
      showTab("build-tab");
      authStatus.textContent = "Sign in to favorite or post";
      if (guestNotice) guestNotice.style.display = "block";
      if (guestAuthBtn) guestAuthBtn.style.display = "inline-block";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (postTabBtn) postTabBtn.style.display = "none";
      if (profileTabBtn) profileTabBtn.style.display = "none";
      await loadBuilds(true, false);
      return;
    }

    loginSection.style.display = "none";
    homeScreen.style.display = "block";
    showTab("build-tab");
    if (guestNotice) guestNotice.style.display = "none";
    if (guestAuthBtn) guestAuthBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (postTabBtn) postTabBtn.style.display = "inline-block";
    if (profileTabBtn) profileTabBtn.style.display = "inline-block";
    const userRef = doc(db, "users", user.uid);
    let userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const q = query(collection(db, "users"), where("uid", "==", user.uid));
      const oldSnap = await getDocs(q);
      if (!oldSnap.empty) {
        const oldData = oldSnap.docs[0].data();
        await setDoc(userRef, {
          uid: user.uid,
          email: oldData.email || user.email || "",
          username: oldData.username || (user.email ? user.email.split("@")[0] : "player"),
          createdAt: oldData.createdAt || Date.now()
        });
      } else {
        const fallbackName = (user.email && user.email.split("@")[0]) || "player";
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          username: fallbackName,
          createdAt: Date.now()
        });
      }
      userSnap = await getDoc(userRef);
    }

    const userData = userSnap.data();
    authStatus.textContent = `✅ Logged in as ${userData.username || userData.email}`;
    loadUserBuilds(user.uid);
    setTimeout(() => { refreshBuildsBtn?.click(); }, 200);
  });
  if (refreshBuildsBtn) {
    refreshBuildsBtn.addEventListener("click", async () => {
      await loadBuilds(true, true);
      const user = auth.currentUser;
      if (user) await loadUserBuilds(user.uid);
      const selectedClan = clanFilter.value;
      if (selectedClan === "All") {
        updateBuildSelector(buildData);
      } else {
        const filtered = Object.fromEntries(
          Object.entries(buildData).filter(([_, data]) => data.clan === selectedClan)
        );
        updateBuildSelector(filtered);
      }
    });
  }

  for (let year = 800; year <= 804; year++) {
    const wrapper = document.createElement("div");
    wrapper.className = "year-block";
    wrapper.innerHTML = `
      <h4>Year ${year}</h4>
      <textarea id="steps-${year}" rows="4" placeholder="Steps for ${year}..."></textarea>
      <label>
        <input type="checkbox" id="toggle-winter-${year}" />
        Add Winter Steps for ${year}
      </label>
      <textarea id="steps-${year}-winter" style="display: none;" rows="3" placeholder="Winter ${year} steps..."></textarea>
    `;
    yearlyContainer.appendChild(wrapper);
  }

  for (let year = 800; year <= 804; year++) {
    const toggle = document.getElementById(`toggle-winter-${year}`);
    const winterBox = document.getElementById(`steps-${year}-winter`);
    toggle.addEventListener("change", () => {
      winterBox.style.display = toggle.checked ? "block" : "none";
    });
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      localStorage.removeItem("stayLoggedIn");
      await auth.signOut();
      authStatus.textContent = "Logged out successfully";
    } catch (err) {
      console.error("logout error:", err);
      authStatus.textContent = "Error Logging out";
    }
  });

  function getEmojiForStep(step) {
    const lower = step.toLowerCase();
    if (lower.includes("wood") || lower.includes("lodge")) return "🌲";
    if (lower.includes("house")) return "🏠";
    if (lower.includes("scout")) return "🧭";
    if (lower.includes("colonize")) return "📍";
    if (lower.includes("training") || lower.includes("military")) return "⚔️";
    if (lower.includes("feast")) return "🍽️";
    if (lower.includes("clear") || lower.includes("attack")) return "🛡️";
    if (lower.includes("trade post")) return "🏦";
    if (lower.includes("warchief")) return "🪓";
    if (lower.includes("brewery")) return "🍺";
    if (lower.includes("mine") || lower.includes("mining")) return "⛏️";
    if (lower.includes("fish")) return "🐟";
    if (lower.includes("merchant")) return "🛍️";
    if (lower.includes("fisherman")) return "🎣";
    if (lower.includes("forge")) return "🛠️";
    if (lower.includes("altar")) return "🕯️";
    if (lower.includes("relic")) return "🗿";
    if (lower.includes("ready")) return "✅";
    return "•";
  }

  function renderBuildSteps(steps) {
    return (steps || []).map(step => {
      if (step.startsWith("#")) return `<h4 class="phase-header">📅 ${step.slice(1).trim()}</h4>`;
      return `<div class="build-step">${getEmojiForStep(step)} ${step}</div>`;
    }).join("");
  }

  function updateBuildSelector(filteredData) {
    buildSelector.innerHTML = "";
    buildList.innerHTML = "";
    for (const buildName in filteredData) {
      const build = filteredData[buildName];
      if (!build || !Array.isArray(build.steps)) continue;

      const option = document.createElement("option");
      option.value = buildName;
      option.textContent = buildName;
      buildSelector.appendChild(option);

      const preview = document.createElement("div");
      preview.className = "build-preview";

      const tagText = (build.situationalTags || []).join(", ") || "None";
      const isOwnBuild = auth.currentUser?.uid === build.userID;
      const canUpvote = !isOwnBuild;
      const upvoteCount = build.upvotes?.length || 0;

      const html = `
        <h4>${buildName} (${build.clan})</h4>
        <p><strong>👤 Submitted by:</strong> ${build.username || "Unknown"}</p>
        <p><strong>Tags:</strong> ${tagText}</p>
        ${canUpvote
          ? `<button class="upvote-btn" data-action="upvote" data-name="${enc(buildName)}">🔼 Upvote</button>`
          : `<em>Can't upvote own build</em>`}
        <p>👍 ${upvoteCount} Upvote${upvoteCount === 1 ? "" : "s"}</p>
        <button class="view-btn" data-action="view" data-name="${enc(buildName)}">View</button>
      `;
      preview.innerHTML = html;
      buildList.appendChild(preview);
    }
  }

  window.loadBuilds = async function (forceRefresh = false, skipInitialDisplay = false) {
    if (!forceRefresh) {
      const cached = localStorage.getItem("cachedBuilds");
      if (cached) {
        buildData = JSON.parse(cached);
        if (!skipInitialDisplay) updateBuildSelector(buildData);
        return;
      }
    }
    const querySnapshot = await getDocs(collection(db, "builds"));
    buildData = {};
    querySnapshot.forEach((d) => {
      const b = d.data();
      buildData[b.name] = {
        steps: b.steps,
        clan: b.clan,
        loreOrder: b.loreOrder || [],
        loreMode: b.loreMode || "json",
        militaryPath: b.militaryPath || "",
        situationalTags: b.situationalTags || [],
        username: b.username || "Unknown",
        upvotes: b.upvotes || [],
        userID: b.userID || ""
      };
    });
    localStorage.setItem("cachedBuilds", JSON.stringify(buildData));
    if (!skipInitialDisplay) updateBuildSelector(buildData);
  };

  clanFilter.addEventListener("change", () => {
    const selectedClan = clanFilter.value;
    if (selectedClan === "All") {
      updateBuildSelector(buildData);
    } else {
      const filtered = Object.fromEntries(
        Object.entries(buildData).filter(([_, data]) => data.clan === selectedClan)
      );
      updateBuildSelector(filtered);
    }
  });

  buildSelector.addEventListener("change", () => {
    const v = buildSelector.value;
    if (!v) return;
  });

  registerBtn.addEventListener("click", () => {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("register-screen").style.display = "block";
  });

  document.getElementById("backToLoginBtn").addEventListener("click", () => {
    document.getElementById("register-screen").style.display = "none";
    document.getElementById("login-screen").style.display = "block";
  });

  document.getElementById("finalizeRegisterBtn").addEventListener("click", async () => {
    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    if (!username || !email || !password) {
      document.getElementById("registerStatus").textContent = "Fill in all fields.";
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await addDoc(collection(db, "users"), { uid: user.uid, username, email });
      document.getElementById("registerStatus").textContent = "✅ Registered!";
    } catch (err) {
      document.getElementById("registerStatus").textContent = `❌ ${err.message}`;
    }
  });

  loginBtn.addEventListener("click", async () => {
    const identifier = emailInput.value.trim();
    const password = passwordInput.value;
    const stay = document.getElementById("stayLoggedIn").checked;
    localStorage.setItem("stayLoggedIn", stay);
    if (!identifier || !password) {
      authStatus.textContent = "Please fill in all fields.";
      return;
    }
    try {
      let emailToUse = identifier;
      if (!identifier.includes("@")) {
        const q = query(collection(db, "users"), where("username", "==", identifier));
        const snap = await getDocs(q);
        if (snap.empty) {
          authStatus.textContent = "❌ Username not found.";
          return;
        }
        emailToUse = snap.docs[0].data().email;
      }
      await window.setPersistence(auth, stay ? window.browserLocalPersistence : window.browserSessionPersistence);
      await signInWithEmailAndPassword(auth, emailToUse, password);
      authStatus.textContent = "✅ Logged in!";
    } catch (error) {
      console.error("Login Error:", error);
      authStatus.textContent = `❌ ${error.message}`;
    }
  });

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      if (!email) {
        authStatus.textContent = "Enter your email first";
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        authStatus.textContent = "Reset email sent!";
      } catch (error) {
        authStatus.textContent = `Error: ${error.message}`;
      }
    });
  }

  submitBtn.addEventListener("click", async () => {
    const buildName = newName.value.trim();
    const selectedClan = newClan.value;
    const user = auth.currentUser;
    if (!user) {
      statusMsg.textContent = "You must be logged in to submit a Build!";
      return;
    }
    const uid = user.uid;
    const selectedPath = pathSelector.value;

    const userSnapshot = await getDocs(query(collection(db, "users"), where("uid", "==", uid)));
    const username = userSnapshot.empty ? user.email : userSnapshot.docs[0].data().username;

    let selectedLores = loreOrderState.map(item => item.lore);
    const situationalTags = ["forestTag", "shipwreckTag", "ironTag", "stoneTag", "ruinsTag", "loreTag"]
      .map(id => document.getElementById(id).value)
      .filter(tag => tag !== "Off");

    if (loreTreeMode.checked) {
      const treeWindow = loreTreeFrame.contentWindow;
      if (treeWindow && typeof treeWindow.getSelectedLoreIndexes === "function") {
        selectedLores = [...treeWindow.getSelectedLoreIndexes()];
      } else {
        statusMsg.textContent = "❌ Could not get lore from lore tree.";
        return;
      }
    }

    if (selectedLores.length === 0) {
      statusMsg.textContent = "⚠️ Please select at least one Lore.";
      return;
    }

    const allSteps = [];
    for (let year = 800; year <= 804; year++) {
      const mainSteps = document.getElementById(`steps-${year}`).value.trim().split("\n").filter(Boolean);
      if (mainSteps.length > 0) {
        allSteps.push(`# ${year}`);
        allSteps.push(...mainSteps);
      }
      const winterSteps = document.getElementById(`steps-${year}-winter`).value.trim().split("\n").filter(Boolean);
      if (winterSteps.length > 0) {
        allSteps.push(`# ${year} Winter`);
        allSteps.push(...winterSteps);
      }
    }

    if (!buildName || allSteps.length === 0 || !selectedClan) {
      statusMsg.textContent = "⚠️ Enter a build name, steps, and select a Clan";
      return;
    }

    if (buildSubmitCooldown) {
      statusMsg.textContent = "⏳ Please wait before submitting again.";
      return;
    }
    buildSubmitCooldown = true;
    setTimeout(() => { buildSubmitCooldown = false; }, 5000);

    const loreMode = loreTreeMode.checked ? "tree" : "json";
    let militaryPaths = {}, clanLore = {};
    try { militaryPaths = JSON.parse(fs.readFileSync(path.resolve(dataDir,"militarypath.json"))); } catch {}
    try { clanLore = JSON.parse(fs.readFileSync(path.resolve(dataDir,"lore.json"))); } catch {}
    try {
      await addDoc(collection(db, "builds"), {
        name: buildName,
        steps: allSteps,
        clan: selectedClan,
        situationalTags,
        userID: uid,
        username: username || user.email,
        militaryPath: selectedPath,
        loreOrder: selectedLores,
        loreMode,
        upvotes: []
      });
      statusMsg.textContent = "✅ Build submitted!";
      localStorage.removeItem("cachedBuilds");
      await loadBuilds(true, true);
      await loadUserBuilds(uid);
      newName.value = "";
      newClan.selectedIndex = 0;
      lorePicker.innerHTML = "";
      loreOrderState = [];
      for (let year = 800; year <= 804; year++) {
        document.getElementById(`steps-${year}`).value = "";
        document.getElementById(`steps-${year}-winter`).value = "";
        document.getElementById(`toggle-winter-${year}`).checked = false;
        document.getElementById(`steps-${year}-winter`).style.display = "none";
      }
      pathSelector.innerHTML = "";
      ["forestTag","shipwreckTag","ironTag","stoneTag","ruinsTag","loreTag"].forEach(id => {
        const dd = document.getElementById(id);
        if (dd) dd.selectedIndex = 0;
      });
    } catch (err) {
      console.error("Error submitting build:", err);
      statusMsg.textContent = "❌ Error submitting build. Check console.";
    }
  });

  async function loadUserBuilds(uid) {
    const container = profileBuildsContainer;
    container.innerHTML = "<p>Loading your builds...</p>";
    try {
      const buildsRef = collection(db, "builds");
      const qMine = query(buildsRef, where("userID", "==", uid));
      const querySnapshot = await getDocs(qMine);
      container.innerHTML = "";
      if (querySnapshot.empty) {
        container.innerHTML = "<p>No builds yet</p>";
      } else {
        querySnapshot.forEach((d) => {
          const b = d.data();
          const upvoteCount = b.upvotes?.length || 0;          
          const card = document.createElement("div");
          card.className = "build-card";
          card.innerHTML = `
            ${b.name || "Untitled"} (${b.clan})
            <p>👍 ${upvoteCount} Upvote${upvoteCount === 1 ? "" : "s"}</p>            
            <button class="view-btn" data-action="view" data-name="${enc(b.name)}">View</button>
            <button class="delete-btn" data-id="${d.id}">Delete</button>
            `;
          container.appendChild(card);
        });
        container.querySelectorAll(".delete-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            if (confirm("Delete this build?")) {
              try {
                await deleteDoc(doc(db, "builds", id));
                localStorage.removeItem("cachedBuilds");
                await loadBuilds(true, true);
                await loadUserBuilds(uid);
                setTimeout(() => { refreshBuildsBtn?.click(); }, 100);
              } catch (err) {
                console.error("Delete Error:", err);
                alert("Error deleting build. See console.");
              }
            }
          });
        });
      }

      const allBuildsSnap = await getDocs(buildsRef);
      const upvoted = [];
      allBuildsSnap.forEach(d => {
        const b = d.data();
        if ((b.upvotes || []).includes(uid) && b.userID !== uid) {
          upvoted.push({ ...b, docId: d.id });
        }
      });

      if (upvoted.length > 0) {
        const upvotedHeader = document.createElement("h3");
        upvotedHeader.textContent = "⭐ Builds You’ve Upvoted";
        container.appendChild(upvotedHeader);
        upvoted.forEach(b => {
          const card = document.createElement("div");
          card.className = "build-card";
          const upvoteCount = b.upvotes?.length || 0;
          card.innerHTML = `
            ${b.name || "Untitled"} (${b.clan})
            <p>👤 Submitted by: ${b.username || "Unknown"}</p>
            <p>👍 ${upvoteCount} Upvote${upvoteCount === 1 ? "" : "s"}</p>
            <h4><button class="view-btn" data-action="view" data-name="${enc(b.name)}">View</button></h4>
          `;
          container.appendChild(card);
        });
      }
    } catch (error) {
      console.error("Error Loading Builds:", error);
      container.innerHTML = "<p>Failed to load builds. Try again later.</p>";
    }
  }

  function openBuildInWindow(name) {
    const build = buildData[name];
    if (!build) return;
    const buildWithName = { ...build, name };
    ipcRenderer.send("open-build-window", buildWithName);
  }
  window.openBuildInWindow = openBuildInWindow;

  async function upvoteBuild(name) {
    const user = auth.currentUser;
    if (!user) { alert("You must be logged in to upvote!"); return; }
    const build = buildData[name];
    if (!build) { alert("Build not found."); return; }
    const refQ = query(collection(db, "builds"), where("name", "==", name));
    const snap = await getDocs(refQ);
    if (snap.empty) { alert("Build not found."); return; }
    const docRef = snap.docs[0].ref;
    const currentUpvotes = build.upvotes || [];
    if (currentUpvotes.includes(user.uid)) { alert("You already upvoted this build!"); return; }
    try {
      const updatedVotes = [...currentUpvotes, user.uid];
      await updateDoc(docRef, { upvotes: updatedVotes });
      localStorage.removeItem("cachedBuilds");
      await loadBuilds(true, true);
      const selectedClan = clanFilter.value;
      const filtered = selectedClan === "All"
        ? buildData
        : Object.fromEntries(Object.entries(buildData).filter(([_, data]) => data.clan === selectedClan));
      updateBuildSelector(filtered);
    } catch (err) {
      console.error("Upvote error:", err);
      alert("Error upvoting. Try again.");
    }
  }
  window.upvoteBuild = upvoteBuild;

  const toggleBtn = document.getElementById("toggleSituationalTags");
  const situationalContent = document.getElementById("situationalTagsContent");
  if (toggleBtn && situationalContent) {
    toggleBtn.addEventListener("click", () => {
      const isVisible = situationalContent.style.display === "block";
      situationalContent.style.display = isVisible ? "none" : "block";
      toggleBtn.textContent = isVisible ? "+ Situational Tags" : "− Situational Tags";
    });
  }

  function showPostPane() { showTab("post-tab"); }

  ipcRenderer.on("app-version", (_, version) => {
    document.body.insertAdjacentHTML("beforeend", `<div style="position:fixed;bottom:10px;right:10px;color:#999;">v${version}</div>`);
  });
  const howToBtn = document.getElementById("howToSubmitBtn");
  const howToContent = document.getElementById("howToSubmitContent");
  if (howToBtn) {
    howToBtn.addEventListener("click", () => {
      const isHidden = howToContent.style.display === "none";
      howToContent.style.display = isHidden ? "block" : "none";
      howToBtn.textContent = isHidden ? "❌ Hide Instructions" : "❓ How to Submit Builds";
    });
  }
}});