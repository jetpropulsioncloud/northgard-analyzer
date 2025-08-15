document.addEventListener("DOMContentLoaded", () => {
  const stayLoggedIn = localStorage.getItem("stayLoggedIn") === "true";
  const persistenceMode = stayLoggedIn ? window.browserLocalPersistence : window.browserSessionPersistence;
  window.setPersistence(window.auth, persistenceMode).then(() => {
    console.log("✅ Persistence set:", stayLoggedIn ? "Local" : "Session");
  });
  const buildSelector = document.getElementById('buildSelector');
  const buildList = document.getElementById('buildList');
  const submitBtn = document.getElementById('submitBuild');
  const newName = document.getElementById('newName');
  const newSteps = document.getElementById('newSteps');
  const statusMsg = document.getElementById('statusMsg');
  const newClan = document.getElementById('newClan');
  const clanFilter = document.getElementById('clanFilter');
  const emailInput = document.getElementById('loginIdentifier');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const authStatus = document.getElementById('authStatus');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginSection = document.getElementById('login-screen');
  const homeScreen = document.getElementById('home-screen');
  const tabContents = document.querySelectorAll('.tab-content');
  const yearlyContainer = document.getElementById("yearly-builds");
  const fs = require('fs');
  const path = require('path');
  const dataDir = path.join(__dirname, 'data');
  const pathSelector = document.getElementById('selectedPath');
  const lorePicker = document.getElementById('lorePicker');
  const { ipcRenderer } = require('electron');
  const loreJsonMode = document.getElementById('loreJsonMode');
  const loreTreeMode = document.getElementById('loreTreeMode');
  const loreTreeFrame = document.getElementById('loreTreeFrame');
  let buildSubmitCooldown = false;
  let loreOrderState = [];


  ipcRenderer.on('update-available', () => {
    const container = document.getElementById('updateProgressContainer');
    const progressBar = document.getElementById('updateProgressBar');
    const progressText = document.getElementById('updateProgressText');

    if (!container || !progressBar || !progressText) return;

    container.style.display = 'block';
    progressBar.value = 0;
    progressText.textContent = `0%`;
  });
  ipcRenderer.on('download-progress', (_, progressObj) => {
    const container = document.getElementById('updateProgressContainer');
    const progressBar = document.getElementById('updateProgressBar');
    const progressText = document.getElementById('updateProgressText');

    if (!container || !progressBar || !progressText) return;

    container.style.display = 'block';
    const percent = Math.round(progressObj.percent);
    progressBar.value = percent;
    progressText.textContent = `${percent}%`;
  });
  ipcRenderer.on('update-downloaded', () => {
    const container = document.getElementById('updateProgressContainer');
    if (container) container.style.display = 'none';
  });

  loreJsonMode.addEventListener('change', () => {
    if (loreJsonMode.checked) {
      lorePicker.style.display = 'block';
      loreTreeFrame.style.display = 'none';
    }
  });

  loreTreeMode.addEventListener('change', () => {
    if (loreTreeMode.checked) {
      lorePicker.style.display = 'none';
      loreTreeFrame.style.display = 'block';
    }
  });
  newClan.addEventListener('change', () => {
    const clan = newClan.value;
    if (!clan) return;

    pathSelector.innerHTML = '';
    lorePicker.innerHTML = '';
    loreOrderState = [];

    const paths = militaryPaths[clan]?.military_paths || [];
    paths.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      pathSelector.appendChild(opt);
    });

    const availableLore = [
      ...(clanLore[clan]?.has_common_lore || []),
      ...(clanLore[clan]?.unique_lore || [])
    ];

    availableLore.forEach(lore => {
      const btn = document.createElement('button');
      btn.className = 'lore-button';
      btn.textContent = lore;
      btn.dataset.order = lore;
      btn.dataset.lore = lore;
      btn.addEventListener('click', () => {
        const currentIndex = loreOrderState.findIndex(item => item.lore === lore);

        if (currentIndex === -1) {
          loreOrderState.push({ lore, order: loreOrderState.length + 1 });
        } else {
          loreOrderState.splice(currentIndex, 1);
          loreOrderState = loreOrderState.map((item, index) => ({ ...item, order: index + 1 }));
        }

        document.querySelectorAll('.lore-button').forEach(button => {
          const matched = loreOrderState.find(item => item.lore === button.dataset.lore);
          button.dataset.order = matched ? matched.order : '';
          button.textContent = matched ? `${matched.order}. ${button.dataset.lore}` : button.dataset.lore;
        });
      });
      lorePicker.appendChild(btn);
    });
  });
  const { db, collection, getDocs, addDoc, auth, createUserWithEmailAndPassword, onAuthStateChanged } = window;
  const militaryPaths = JSON.parse(
    fs.readFileSync(path.resolve(dataDir, 'militarypath.json'))
  );
  const clanLore = JSON.parse(
    fs.readFileSync(path.resolve(dataDir, 'lore.json'))
  );

  let buildData = {};

  function showTab(tabId) {
    tabContents.forEach(div => {
      div.style.display = 'none';
    });
    const tab = document.getElementById(tabId);
    if (tab) tab.style.display = 'block';
  }
  window.showTab = showTab;
  const tagIds = ['forestTag', 'shipwreckTag', 'ironTag', 'stoneTag', 'ruinsTag', 'loreTag'];
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginSection.style.display = 'none';
      document.getElementById('register-screen').style.display = 'none';
      homeScreen.style.display = 'block';
      showTab('build-tab');
      authStatus.textContent = `✅ Logged in as ${user.email}`;
      loadUserBuilds(user.uid);
      console.log("🟢 onAuthStateChanged: Logged in as", user.email);
      setTimeout(() => {
        if (refreshBuildsBtn) refreshBuildsBtn.click();
      }, 200);
    } else {
      loginSection.style.display = 'block';
      homeScreen.style.display = 'none';
      buildList.innerHTML = '';
      buildSelector.innerHTML = '';
      authStatus.textContent = '🔒 Please log in';
      console.log("🔒 onAuthStateChanged: Logged out");
    }
  });



  const refreshBuildsBtn = document.getElementById('refreshBuildsBtn');
  refreshBuildsBtn.addEventListener('click', async () => {
    await loadBuilds (true, true);
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
  logoutBtn.addEventListener('click', async () => {
    try {
      localStorage.removeItem("stayLoggedIn");  // 🧼 optional
      await auth.signOut();
      authStatus.textContent = "Logged out successfully";
    } catch (err) {
      console.error("logout error:", err);
      authStatus.textContent = "Error Logging out";
    }
  });


  function showBuild(name, data = buildData) {
    const build = data[name];
    let html = '';
    
    html += `<details class="build-section"open>
      <summary><strong>📋 Build Info</strong></summary>`;
    if (build.username) {
      html += `<p><strong>👤 Submitted by:</strong> ${build.username}</p><hr>`;
    }
    if (build.militaryPath) {
      html += `<h4>⚔️ Military Path</h4><p>${build.militaryPath}</p><hr>`;
    }

    if (build.loreOrder && build.loreOrder.length > 0) {
      html += `<h4>📜 Lore Order</h4><ul class="lore-order-list">`;
      build.loreOrder.forEach((lore, index) => {
        html += `<li>${index + 1}. ${lore}</li>`;
      });
      html += `</ul>`;
    }
    if (build.situationalTags && build.situationalTags.length > 0) {
      html += `<h4>🌍 Situational Tags</h4><div class="tag-pill-container">`;
      build.situationalTags.forEach(tag => {
        html += `<span class="tag-pill">${tag}</span>`;
      });
      html += `</div><hr>`;
    }
    html += `</details><hr>`;
    html += renderBuildSteps(build.steps);
  }

  function updateBuildSelector(filteredData) {
    buildSelector.innerHTML = '';
    buildList.innerHTML = '';

    for (const buildName in filteredData) {
      const build = filteredData[buildName];
      if (!build || !build.steps || !Array.isArray(build.steps)) continue;
      const option = document.createElement('option');
      option.value = buildName;
      option.textContent = buildName;
      buildSelector.appendChild(option);
      const preview = document.createElement('div')
      preview.className = 'build-preview';
      const tagText = (build.situationalTags || []).join(', ') || 'None';
      const isOwnBuild = auth.currentUser?.uid === build.userID;
      const canUpvote = !isOwnBuild;
      const upvoteCount = build.upvotes?.length || 0;
      const previewHTML = `
        <h4>${buildName} (${build.clan})</h4>
        <p><strong>👤 Submitted by:</strong> ${build.username || "Unknown"}</p>
        <p><strong>Tags:</strong> ${tagText}</p>
        ${canUpvote 
          ? `<button class="upvote-btn" onclick="upvoteBuild('${buildName}')">🔼 Upvote</button>` 
          : `<em>Can't upvote own build</em>`}
        <p>👍 ${upvoteCount} Upvote${upvoteCount === 1 ? '' : 's'}</p>
        <button onclick="openBuildInWindow('${buildName}')">View</button>
      `;
      preview.innerHTML = previewHTML;
      buildList.appendChild(preview);
    }
    if (buildSelector.options.length > 0) {
      buildSelector.selectedIndex = 0;
      showBuild(buildSelector.value, filteredData);
    } else {
      buildList.innerHTML = '<li>No builds for this clan.</li>';
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

    querySnapshot.forEach((doc) => {
      const build = doc.data();
      buildData[build.name] = {
        steps: build.steps,
        clan: build.clan,
        loreOrder: build.loreOrder || [],
        loreMode: build.loreMode || 'json',
        militaryPath: build.militaryPath || '',
        situationalTags: build.situationalTags || [],
        username: build.username || "Unknown",
        upvotes: build.upvotes || []
      };
    });

    localStorage.setItem("cachedBuilds", JSON.stringify(buildData));
    if (!skipInitialDisplay) updateBuildSelector(buildData);
  };


  clanFilter.addEventListener('change', () => {
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

  buildSelector.addEventListener('change', () => {
    showBuild(buildSelector.value);
  });

  registerBtn.addEventListener('click', () => {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('register-screen').style.display = 'block';
  });

  document.getElementById('backToLoginBtn').addEventListener('click', () => {
    document.getElementById('register-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
  });

  document.getElementById('finalizeRegisterBtn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) {
      document.getElementById('registerStatus').textContent = "Fill in all fields.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await addDoc(collection(db, "users"), {
        uid: user.uid,
        username: username,
        email: email
      });
      document.getElementById('registerStatus').textContent = "✅ Registered!";
    } catch (err) {
      document.getElementById('registerStatus').textContent = `❌ ${err.message}`;
    }
  });

  loginBtn.addEventListener('click', async () => {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('password').value;
    const stayLoggedIn = document.getElementById('stayLoggedIn').checked;
    localStorage.setItem("stayLoggedIn", stayLoggedIn);
    if (!identifier || !password) {
      authStatus.textContent = "Please fill in all fields.";
      return;
    }

    try {
      let emailToUse = identifier;

      if (!identifier.includes('@')) {
        const q = window.query(window.collection(window.db, "users"), window.where("username", "==", identifier));
        const snap = await window.getDocs(q);
        if (snap.empty) {
          authStatus.textContent = "❌ Username not found.";
          return;
        }
        emailToUse = snap.docs[0].data().email;
      }
      console.log("Persistence mode:", stayLoggedIn ? "LOCAL" : "SESSION");
      await window.setPersistence(
        window.auth,
        stayLoggedIn ? window.browserLocalPersistence : window.browserSessionPersistence
      );

      await window.signInWithEmailAndPassword(window.auth, emailToUse, password);
      authStatus.textContent = "✅ Logged in!";
    } catch (error) {
      console.error("Login Error:", error);
      authStatus.textContent = `❌ ${error.message}`;
    }
  });

  submitBtn.addEventListener('click', async () => {
    const buildName = newName.value.trim();
    const selectedClan = newClan.value;
    const user = auth.currentUser;
    const uid = user.uid;
    const selectedPath = pathSelector.value;
    const userSnapshot = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)));
    const username = userSnapshot.empty ? user.email : userSnapshot.docs[0].data().username;
    let selectedLores = loreOrderState.map(item => item.lore);
    const situationalTags = tagIds
    .map(id => document.getElementById(id).value)
    .filter(tag => tag !== "Off");
    let allSteps = [];
    if (loreJsonMode.checked) {
      selectedLores = loreOrderState.map(item => item.lore);
    } else if (loreTreeMode.checked) {
      const treeWindow = loreTreeFrame.contentWindow;
      if (treeWindow && typeof treeWindow.getSelectedLores === "function") {
      selectedLores = treeWindow.getSelectedLoreIndexes();
      } else {
        statusMsg.textContent = "❌ Could not get lore from lore tree.";
        return;
      }
    }
    if (selectedLores.length === 0) {
      statusMsg.textContent = "⚠️ Please select at least one Lore.";
      return;
    }
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
    if (!user) {
      statusMsg.textContent = "You must be logged in to submit a Build!";
      return;
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
    setTimeout(() => {
      buildSubmitCooldown = false;
    }, 5000);
    try {
      await addDoc(collection(db, "builds"), {
        name: buildName,
        steps: allSteps,
        clan: selectedClan,
        situationalTags: situationalTags,
        userID: user.uid,
        username: username || user.email,
        militaryPath: selectedPath,
        loreOrder: selectedLores,
        loreMode: loreMode,
        upvotes: []
      });

      statusMsg.textContent = "✅ Build submitted!";
      localStorage.removeItem("cachedBuilds");
      await loadBuilds();
      await loadUserBuilds(user.uid);
    } catch (err) {
      console.error("Error submitting build:", err);
      statusMsg.textContent = "❌ Error submitting build. Check console.";
    }
    newName.value = "";
    newClan.selectedIndex = 0;
    lorePicker.innerHTML = '';
    loreOrderState = [];
    for (let year = 800; year <= 804; year++) {
      document.getElementById(`steps-${year}`).value = '';
      document.getElementById(`steps-${year}-winter`).value = '';
      document.getElementById(`toggle-winter-${year}`).checked = false;
      document.getElementById(`steps-${year}-winter`).style.display = 'none';
    }
    pathSelector.innerHTML = '';
    tagIds.forEach(id => {
      const dropdown = document.getElementById(id);
      dropdown.selectedIndex = 0;
    });
    const allBuildsSnap = await getDocs(collection(db, "builds"));
    const upvoted = [];

    allBuildsSnap.forEach(doc => {
      const build = doc.data();
      if ((build.upvotes || []).includes(user.uid) && build.userID !== uid) {
        upvoted.push({ ...build, docId: doc.id });
      }
    });

    if (upvoted.length > 0) {
      const upvotedHeader = document.createElement("h3");
      upvotedHeader.textContent = "⭐ Builds You’ve Upvoted";
      container.appendChild(upvotedHeader);

      upvoted.forEach(build => {
        const card = document.createElement("div");
        card.className = "build-card";
        const upvoteCount = build.upvotes?.length || 0;

        card.innerHTML = `
          <h4>${build.name || "Untitled"} (${build.clan})</h4>
          <p><strong>👤 Submitted by:</strong> ${build.username || "Unknown"}</p>
          <p>👍 ${upvoteCount} Upvote${upvoteCount === 1 ? '' : 's'}</p>
          <button onclick="openBuildInWindow('${build.name}')">View</button>
        `;
        container.appendChild(card);
      });
    }
  });


  function closeApp() {
    ipcRenderer.send('request-app-close');
  }
  window.closeApp = closeApp;

///  ipcRenderer.on('logout-before-close', () => {
//    const stayLoggedIn = localStorage.getItem("stayLoggedIn") === "true";

 //   if (!stayLoggedIn) {
  //    auth.signOut().then(() => {
   //     console.log("🔒 Logged out before app closed.");
    //    window.close();
    //  });
    //} else {
     // console.log("✅ Staying logged in after close.");
      //window.close();
   // }
  //});
  const toggleBtn = document.getElementById('toggleSituationalTags');
  const situationalContent = document.getElementById('situationalTagsContent');

  if (toggleBtn && situationalContent) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = situationalContent.style.display === 'block';
      situationalContent.style.display = isVisible ? 'none' : 'block';
      toggleBtn.textContent = isVisible ? '+ Situational Tags' : '− Situational Tags';
    });
  }
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
    return steps.map(step => {
      if (step.startsWith("#")) {
        return `<h4 class="phase-header">📅 ${step.slice(1).trim()}</h4>`;
      } else {
        return `<div class="build-step">${getEmojiForStep(step)} ${step}</div>`;
      }
    }).join("");
  }
  async function loadUserBuilds(uid) {
    const container = document.getElementById("profileBuildsContainer");
    container.innerHTML = "<p>Loading your builds...</p>";

    try {
      const buildsRef = collection(db, "builds");
      const q = window.query(buildsRef, window.where("userID", "==", uid));
      const querySnapshot = await getDocs(q);

      container.innerHTML = "";

      if (querySnapshot.empty) {
        container.innerHTML = "<p>No builds yet</p>";
      } else {
        querySnapshot.forEach((doc) => {
          const build = doc.data();
          const card = document.createElement("div");
          card.className = "build-card";
          card.innerHTML = `
            <h3>${build.name || "Untitled"} (${build.clan})</h3>
            <p><strong>👤 Username:</strong> ${build.username || "Unknown"}</p>
            <div class="steps-block">${renderBuildSteps(build.steps || [])}</div>
            <button class="delete-btn" data-id="${doc.id}">Delete</button>
          `;
          container.appendChild(card);
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (confirm("Are you sure you want to delete this build?")) {
              try {
                await window.deleteDoc(window.doc(db, "builds", id));
                await loadUserBuilds(uid);
                const uid = user.uid;
                localStorage.removeItem("cachedBuilds");
                await loadBuilds(true, true);
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

      allBuildsSnap.forEach(doc => {
        const build = doc.data();
        if ((build.upvotes || []).includes(uid) && build.userID !== uid) {
          upvoted.push({ ...build, docId: doc.id });
        }
      });

      if (upvoted.length > 0) {
        const upvotedHeader = document.createElement("h3");
        upvotedHeader.textContent = "⭐ Builds You’ve Upvoted";
        container.appendChild(upvotedHeader);

        upvoted.forEach(build => {
          const card = document.createElement("div");
          card.className = "build-card";
          const upvoteCount = build.upvotes?.length || 0;
          card.innerHTML = `
            <h4>${build.name || "Untitled"} (${build.clan})</h4>
            <p><strong>👤 Submitted by:</strong> ${build.username || "Unknown"}</p>
            <p>👍 ${upvoteCount} Upvote${upvoteCount === 1 ? '' : 's'}</p>
            <button onclick="openBuildInWindow('${build.name}')">View</button>
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
    const buildWithName = { ...build, name }; 
    ipcRenderer.send('open-build-window', buildWithName);
  }
  window.openBuildInWindow = openBuildInWindow;

  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn')
  forgotPasswordBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
      authStatus.textContent = "Enter your email first";
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      authStatus.textContent = "Reset email sent!"
    } catch (error) {
      authStatus.textContent =`Error: ${error.message}`;
    }
  });

  ipcRenderer.on('app-version', (_, version) => {
    document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;bottom:10px;right:10px;color:#999;">v${version}</div>`);
  });  

  async function upvoteBuild(name) {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to upvote!");

    const build = buildData[name];
    const buildRef = query(collection(db, "builds"), where("name", "==", name));
    const snapshot = await getDocs(buildRef);

    if (snapshot.empty) return alert("Build not found.");

    const docRef = snapshot.docs[0].ref;
    const currentUpvotes = build.upvotes || [];

    if (currentUpvotes.includes(user.uid)) {
      alert("You already upvoted this build!");
      return;
    }

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
  function forceInputFocus(targetId) {
    const trap = document.getElementById("focusTrap");
    const target = document.getElementById(targetId);
    if (!trap || !target) return;
  }

  //loadBuilds();
});