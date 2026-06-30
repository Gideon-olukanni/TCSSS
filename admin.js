import {
  db,
  auth,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "./firebase-config.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const state = {
  user: null,
  edit: {
    news: null,
    council: null,
    principal: null,
    gallery: null,
    club: null
  },
  photoCache: {
    council: null,
    principal: null,
    gallery: null
  },
  statusTimer: null
};

const CATEGORIES = [
  "Assembly Ground",
  "Classroom Block",
  "Library",
  "Science Laboratory",
  "ICT Room",
  "Sports Field"
];

const COUNCIL_ROLES = [
  "Senior Prefect (Boy)",
  "Senior Prefect (Girl)",
  "Assistant Senior Prefect",
  "Social Prefect",
  "Sports Prefect",
  "Press Prefect",
  "Other"
];

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function paragraphs(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .split(/\n\s*\n/)
    .map((part) => `<p>${escapeHtml(part.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function status(message, kind = "success") {
  const el = $("#statusMsg");
  el.textContent = message;
  el.className = `status-msg ${kind}`;
  el.hidden = false;
  clearTimeout(state.statusTimer);
  state.statusTimer = setTimeout(() => {
    el.hidden = true;
  }, 4200);
}

function setLoading(button, loading, label) {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = label || "Saving…";
  } else {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

function collectValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function setChecked(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

function clearInput(id) {
  const el = document.getElementById(id);
  if (el) el.value = "";
}

async function readImageAsCompressedDataUrl(file, maxDimension = 1200, quality = 0.78) {
  if (!file) return null;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        let { width, height } = image;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round(height * maxDimension / width);
            width = maxDimension;
          } else {
            width = Math.round(width * maxDimension / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = () => reject(new Error("Could not read that image file."));
      image.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });

  const approxBytes = Math.round(dataUrl.length * 0.75);
  if (approxBytes > 900000) {
    throw new Error(`That image is still too large after compression (${formatBytes(approxBytes)}). Please use a simpler or smaller photo.`);
  }
  return dataUrl;
}

async function readPhotoFromInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input || !input.files || !input.files.length) return null;
  return readImageAsCompressedDataUrl(input.files[0]);
}

function revealLogin(showLogin) {
  $("#loginScreen").hidden = !showLogin;
  $("#dashboard").hidden = showLogin;
}

function switchTab(tabName) {
  $$(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  $$(".tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== `tab-${tabName}`;
  });
  state.activeTab = tabName;
}

function resetSection(section) {
  if (section === "news") {
    state.edit.news = null;
    setValue("newsEditId", "");
    setValue("newsTitle", "");
    setValue("newsDate", "");
    setChecked("newsFeatured", false);
    setValue("newsBody", "");
    $("#newsFormTitle").textContent = "Add a News Item";
    $("#newsCancelBtn").hidden = true;
  }

  if (section === "council") {
    state.edit.council = null;
    state.photoCache.council = null;
    setValue("councilEditId", "");
    setValue("councilYear", "");
    setValue("councilName", "");
    setValue("councilRole", COUNCIL_ROLES[0]);
    clearInput("councilPhoto");
    $("#councilFormTitle").textContent = "Add a Prefect";
    $("#councilCancelBtn").hidden = true;
  }

  if (section === "principal") {
    state.edit.principal = null;
    state.photoCache.principal = null;
    setValue("principalEditId", "");
    setValue("principalName", "");
    setValue("principalYear", "");
    setChecked("principalCurrent", false);
    clearInput("principalPhoto");
    $("#principalFormTitle").textContent = "Add a Principal";
    $("#principalCancelBtn").hidden = true;
  }

  if (section === "gallery") {
    state.edit.gallery = null;
    state.photoCache.gallery = null;
    setValue("galleryEditId", "");
    setValue("galleryCategory", CATEGORIES[0]);
    setValue("galleryCaption", "");
    clearInput("galleryPhoto");
    $("#galleryFormTitle").textContent = "Add a Gallery Photo";
    $("#galleryCancelBtn").hidden = true;
  }

  if (section === "club") {
    state.edit.club = null;
    setValue("clubEditId", "");
    setValue("clubName", "");
    setValue("clubDesc", "");
    $("#clubFormTitle").textContent = "Add a Club";
    $("#clubCancelBtn").hidden = true;
  }
}

function sortByDateDesc(items, field) {
  return [...items].sort((a, b) => {
    const da = new Date(a[field] || 0).getTime();
    const dbv = new Date(b[field] || 0).getTime();
    return dbv - da;
  });
}

function sortByStringDesc(items, field) {
  return [...items].sort((a, b) => String(b[field] || "").localeCompare(String(a[field] || "")));
}

function sortByStringAsc(items, field) {
  return [...items].sort((a, b) => String(a[field] || "").localeCompare(String(b[field] || "")));
}

function renderItemList(containerId, items, emptyHtml, renderItem) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `<div class="empty-note">${emptyHtml}</div>`;
    return;
  }

  items.forEach((item) => container.appendChild(renderItem(item)));
}

function createRow({ title, subtitle, thumb, actions, extraClass = "" }) {
  const row = document.createElement("article");
  row.className = `item-row ${extraClass}`.trim();

  const left = document.createElement("div");
  left.className = "item-main";

  if (thumb) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = thumb;
    img.alt = "";
    left.appendChild(img);
  }

  const meta = document.createElement("div");
  meta.className = "meta";

  const t = document.createElement("div");
  t.className = "t";
  t.innerHTML = title;
  meta.appendChild(t);

  if (subtitle) {
    const s = document.createElement("div");
    s.className = "s";
    s.innerHTML = subtitle;
    meta.appendChild(s);
  }

  left.appendChild(meta);

  const right = document.createElement("div");
  right.className = "item-actions";
  actions.forEach((action) => right.appendChild(action));

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function button(label, className, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function docRef(collectionName, id) {
  return doc(db, collectionName, id);
}

async function saveNews(event) {
  event.preventDefault();
  const submitBtn = $("#newsSaveBtn");
  setLoading(submitBtn, true, "Saving…");

  try {
    const payload = {
      title: collectValue("newsTitle"),
      date: collectValue("newsDate"),
      featured: $("#newsFeatured").checked,
      body: collectValue("newsBody")
    };

    if (!payload.title) throw new Error("Title is required.");
    if (!payload.body) throw new Error("Details are required.");

    const editId = collectValue("newsEditId");
    if (editId) {
      await updateDoc(docRef("news", editId), payload);
      status("News item updated.");
    } else {
      await addDoc(collection(db, "news"), payload);
      status("News item saved.");
    }

    resetSection("news");
    await loadNews();
  } catch (error) {
    status(`Could not save news: ${error.message}`, "error");
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadNews() {
  try {
    const snap = await getDocs(collection(db, "news"));
    const items = [];
    snap.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() }));

    const sorted = sortByDateDesc(items, "date");
    renderItemList("newsList", sorted, "No news items yet.", (item) => {
      const row = createRow({
        title: `${escapeHtml(item.title || "Untitled")}${item.featured ? " <span class='badge'>Featured</span>" : ""}`,
        subtitle: `${escapeHtml(item.date || "")}<br>${escapeHtml(String(item.body || "").slice(0, 140))}${(item.body || "").length > 140 ? "…" : ""}`,
        actions: [
          button("Edit", "btn btn-ghost btn-sm", () => editNews(item.id, item)),
          button("Delete", "btn btn-danger btn-sm", () => removeDoc("news", item.id, loadNews))
        ]
      });
      return row;
    });
  } catch (error) {
    status(`Could not load news: ${error.message}`, "error");
  }
}

function editNews(id, data) {
  state.edit.news = id;
  setValue("newsEditId", id);
  setValue("newsTitle", data.title || "");
  setValue("newsDate", data.date || "");
  setChecked("newsFeatured", !!data.featured);
  setValue("newsBody", data.body || "");
  $("#newsFormTitle").textContent = "Edit News Item";
  $("#newsCancelBtn").hidden = false;
  switchTab("news");
}

async function saveCouncil(event) {
  event.preventDefault();
  const submitBtn = $("#councilSaveBtn");
  setLoading(submitBtn, true, "Saving…");

  try {
    const filePhoto = await readPhotoFromInput("councilPhoto");
    const payload = {
      academicYear: collectValue("councilYear"),
      name: collectValue("councilName"),
      role: collectValue("councilRole"),
      photoUrl: filePhoto || state.photoCache.council || ""
    };

    if (!payload.academicYear) throw new Error("Academic year is required.");
    if (!payload.name) throw new Error("Full name is required.");
    if (!payload.role) throw new Error("Role is required.");

    const editId = collectValue("councilEditId");
    if (editId) {
      await updateDoc(docRef("executiveCouncil", editId), payload);
      status("Prefect updated.");
    } else {
      await addDoc(collection(db, "executiveCouncil"), payload);
      status("Prefect saved.");
    }

    resetSection("council");
    await loadCouncil();
  } catch (error) {
    status(`Could not save prefect: ${error.message}`, "error");
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadCouncil() {
  try {
    const snap = await getDocs(collection(db, "executiveCouncil"));
    const items = [];
    snap.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() }));
    const sorted = sortByStringDesc(items, "academicYear");

    renderItemList("councilList", sorted, "No prefects added yet.", (item) => {
      const row = createRow({
        thumb: item.photoUrl || "",
        title: `${escapeHtml(item.name || "Unnamed")}${item.role === "Senior Prefect (Boy)" || item.role === "Senior Prefect (Girl)" ? " <span class='badge'>Main Role</span>" : ""}`,
        subtitle: `${escapeHtml(item.role || "")} · ${escapeHtml(item.academicYear || "")}`,
        actions: [
          button("Edit", "btn btn-ghost btn-sm", () => editCouncil(item.id, item)),
          button("Delete", "btn btn-danger btn-sm", () => removeDoc("executiveCouncil", item.id, loadCouncil))
        ]
      });
      return row;
    });
  } catch (error) {
    status(`Could not load council: ${error.message}`, "error");
  }
}

function editCouncil(id, data) {
  state.edit.council = id;
  state.photoCache.council = data.photoUrl || "";
  setValue("councilEditId", id);
  setValue("councilYear", data.academicYear || "");
  setValue("councilName", data.name || "");
  setValue("councilRole", data.role || COUNCIL_ROLES[0]);
  clearInput("councilPhoto");
  $("#councilFormTitle").textContent = "Edit Prefect";
  $("#councilCancelBtn").hidden = false;
  switchTab("council");
}

async function saveLeadership(event) {
  event.preventDefault();
  const submitBtn = $("#leadershipSaveBtn");
  setLoading(submitBtn, true, "Saving…");

  try {
    const payload = {
      principalName: collectValue("ldPrincipalName"),
      principalMessage: $("#ldPrincipalMsg").value.trim(),
      seniorPrefectBoyName: collectValue("ldBoyName"),
      seniorPrefectBoyMessage: $("#ldBoyMsg").value.trim(),
      seniorPrefectGirlName: collectValue("ldGirlName"),
      seniorPrefectGirlMessage: $("#ldGirlMsg").value.trim()
    };

    await setDoc(doc(db, "leadershipMessages", "main"), payload);
    status("Leadership messages saved.");
  } catch (error) {
    status(`Could not save leadership messages: ${error.message}`, "error");
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadLeadership() {
  try {
    const snap = await getDoc(doc(db, "leadershipMessages", "main"));
    if (!snap.exists()) return;
    const data = snap.data();
    setValue("ldPrincipalName", data.principalName || "");
    setValue("ldPrincipalMsg", data.principalMessage || "");
    setValue("ldBoyName", data.seniorPrefectBoyName || "");
    setValue("ldBoyMsg", data.seniorPrefectBoyMessage || "");
    setValue("ldGirlName", data.seniorPrefectGirlName || "");
    setValue("ldGirlMsg", data.seniorPrefectGirlMessage || "");
  } catch (error) {
    status(`Could not load leadership messages: ${error.message}`, "error");
  }
}

async function savePrincipals(event) {
  event.preventDefault();
  const submitBtn = $("#principalSaveBtn");
  setLoading(submitBtn, true, "Saving…");

  try {
    const photo = await readPhotoFromInput("principalPhoto");
    const payload = {
      name: collectValue("principalName"),
      yearStarted: collectValue("principalYear"),
      isCurrent: $("#principalCurrent").checked,
      photoUrl: photo || state.photoCache.principal || ""
    };

    if (!payload.name) throw new Error("Name is required.");
    if (!payload.yearStarted) throw new Error("Year started is required.");

    const editId = collectValue("principalEditId");
    if (editId) {
      await updateDoc(docRef("principals", editId), payload);
      status("Principal updated.");
    } else {
      await addDoc(collection(db, "principals"), payload);
      status("Principal saved.");
    }

    resetSection("principal");
    await loadPrincipals();
  } catch (error) {
    status(`Could not save principal: ${error.message}`, "error");
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadPrincipals() {
  try {
    const snap = await getDocs(collection(db, "principals"));
    const items = [];
    snap.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() }));
    const sorted = sortByStringDesc(items, "yearStarted");

    renderItemList("principalList", sorted, "No principal records yet.", (item) => {
      const row = createRow({
        thumb: item.photoUrl || "",
        title: `${escapeHtml(item.name || "Unnamed")}${item.isCurrent ? " <span class='badge'>Current</span>" : ""}`,
        subtitle: `Since ${escapeHtml(item.yearStarted || "")}`,
        actions: [
          button("Edit", "btn btn-ghost btn-sm", () => editPrincipal(item.id, item)),
          button("Delete", "btn btn-danger btn-sm", () => removeDoc("principals", item.id, loadPrincipals))
        ]
      });
      return row;
    });
  } catch (error) {
    status(`Could not load principals: ${error.message}`, "error");
  }
}

function editPrincipal(id, data) {
  state.edit.principal = id;
  state.photoCache.principal = data.photoUrl || "";
  setValue("principalEditId", id);
  setValue("principalName", data.name || "");
  setValue("principalYear", data.yearStarted || "");
  setChecked("principalCurrent", !!data.isCurrent);
  clearInput("principalPhoto");
  $("#principalFormTitle").textContent = "Edit Principal";
  $("#principalCancelBtn").hidden = false;
  switchTab("principals");
}

async function saveGallery(event) {
  event.preventDefault();
  const submitBtn = $("#gallerySaveBtn");
  setLoading(submitBtn, true, "Saving…");

  try {
    const photo = await readPhotoFromInput("galleryPhoto");
    const payload = {
      category: collectValue("galleryCategory"),
      caption: collectValue("galleryCaption"),
      photoUrl: photo || state.photoCache.gallery || ""
    };

    if (!payload.category) throw new Error("Category is required.");
    if (!payload.photoUrl) throw new Error("Photo is required.");

    const editId = collectValue("galleryEditId");
    if (editId) {
      await updateDoc(docRef("galleryPhotos", editId), payload);
      status("Gallery photo updated.");
    } else {
      await addDoc(collection(db, "galleryPhotos"), payload);
      status("Gallery photo saved.");
    }

    resetSection("gallery");
    await loadGallery();
  } catch (error) {
    status(`Could not save gallery photo: ${error.message}`, "error");
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadGallery() {
  try {
    const snap = await getDocs(collection(db, "galleryPhotos"));
    const items = [];
    snap.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() }));
    const sorted = sortByStringAsc(items, "category");

    renderItemList("galleryList", sorted, "No gallery photos yet.", (item) => {
      const row = createRow({
        thumb: item.photoUrl || "",
        title: escapeHtml(item.category || "Uncategorized"),
        subtitle: escapeHtml(item.caption || ""),
        actions: [
          button("Edit", "btn btn-ghost btn-sm", () => editGallery(item.id, item)),
          button("Delete", "btn btn-danger btn-sm", () => removeDoc("galleryPhotos", item.id, loadGallery))
        ]
      });
      return row;
    });
  } catch (error) {
    status(`Could not load gallery photos: ${error.message}`, "error");
  }
}

function editGallery(id, data) {
  state.edit.gallery = id;
  state.photoCache.gallery = data.photoUrl || "";
  setValue("galleryEditId", id);
  setValue("galleryCategory", data.category || CATEGORIES[0]);
  setValue("galleryCaption", data.caption || "");
  clearInput("galleryPhoto");
  $("#galleryFormTitle").textContent = "Edit Gallery Photo";
  $("#galleryCancelBtn").hidden = false;
  switchTab("gallery");
}

async function saveContact(event) {
  event.preventDefault();
  const submitBtn = $("#contactSaveBtn");
  setLoading(submitBtn, true, "Saving…");

  try {
    const payload = {
      email: collectValue("contactEmail"),
      phone: collectValue("contactPhone"),
      facebook: collectValue("contactFacebook"),
      instagram: collectValue("contactInstagram")
    };

    await setDoc(doc(db, "contactInfo", "main"), payload);
    status("Contact details saved.");
  } catch (error) {
    status(`Could not save contact details: ${error.message}`, "error");
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadContact() {
  try {
    const snap = await getDoc(doc(db, "contactInfo", "main"));
    if (!snap.exists()) return;
    const data = snap.data();
    setValue("contactEmail", data.email || "");
    setValue("contactPhone", data.phone || "");
    setValue("contactFacebook", data.facebook || "");
    setValue("contactInstagram", data.instagram || "");
  } catch (error) {
    status(`Could not load contact details: ${error.message}`, "error");
  }
}

async function saveClub(event) {
  event.preventDefault();
  const submitBtn = $("#clubSaveBtn");
  setLoading(submitBtn, true, "Saving…");

  try {
    const payload = {
      name: collectValue("clubName"),
      desc: collectValue("clubDesc")
    };

    if (!payload.name) throw new Error("Club name is required.");

    const editId = collectValue("clubEditId");
    if (editId) {
      await updateDoc(docRef("clubs", editId), payload);
      status("Club updated.");
    } else {
      await addDoc(collection(db, "clubs"), payload);
      status("Club saved.");
    }

    resetSection("club");
    await loadClubs();
  } catch (error) {
    status(`Could not save club: ${error.message}`, "error");
  } finally {
    setLoading(submitBtn, false);
  }
}

async function loadClubs() {
  try {
    const snap = await getDocs(collection(db, "clubs"));
    const items = [];
    snap.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() }));
    const sorted = sortByStringAsc(items, "name");

    renderItemList("clubList", sorted, "No clubs added yet.", (item) => {
      const row = createRow({
        title: escapeHtml(item.name || "Unnamed Club"),
        subtitle: escapeHtml(item.desc || ""),
        actions: [
          button("Edit", "btn btn-ghost btn-sm", () => editClub(item.id, item)),
          button("Delete", "btn btn-danger btn-sm", () => removeDoc("clubs", item.id, loadClubs))
        ]
      });
      return row;
    });
  } catch (error) {
    status(`Could not load clubs: ${error.message}`, "error");
  }
}

function editClub(id, data) {
  state.edit.club = id;
  setValue("clubEditId", id);
  setValue("clubName", data.name || "");
  setValue("clubDesc", data.desc || "");
  $("#clubFormTitle").textContent = "Edit Club";
  $("#clubCancelBtn").hidden = false;
  switchTab("clubs");
}

async function removeDoc(collectionName, id, reloadFn) {
  const confirmed = window.confirm("Delete this item? This cannot be undone.");
  if (!confirmed) return;

  try {
    await deleteDoc(docRef(collectionName, id));
    status("Item deleted.");
    await reloadFn();
  } catch (error) {
    status(`Could not delete item: ${error.message}`, "error");
  }
}

async function loadAll() {
  await Promise.all([
    loadNews(),
    loadCouncil(),
    loadLeadership(),
    loadPrincipals(),
    loadGallery(),
    loadContact(),
    loadClubs()
  ]);
}

function setAuthenticatedUser(user) {
  state.user = user;
  $("#whoEmail").textContent = user.email || "";
}

// -----------------------------
// Event listeners
// -----------------------------
$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitBtn = $("#loginBtn");
  setLoading(submitBtn, true, "Signing in…");

  try {
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    if (!email || !password) throw new Error("Enter your email and password.");
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    $("#loginError").textContent = error.message;
    $("#loginError").hidden = false;
  } finally {
    setLoading(submitBtn, false);
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    status(`Could not sign out: ${error.message}`, "error");
  }
});

$$(".tab-btn").forEach((buttonEl) => {
  buttonEl.addEventListener("click", () => switchTab(buttonEl.dataset.tab));
});

$("#newsForm").addEventListener("submit", saveNews);
$("#newsCancelBtn").addEventListener("click", () => resetSection("news"));

$("#councilForm").addEventListener("submit", saveCouncil);
$("#councilCancelBtn").addEventListener("click", () => resetSection("council"));

$("#leadershipForm").addEventListener("submit", saveLeadership);

$("#principalForm").addEventListener("submit", savePrincipals);
$("#principalCancelBtn").addEventListener("click", () => resetSection("principal"));

$("#galleryForm").addEventListener("submit", saveGallery);
$("#galleryCancelBtn").addEventListener("click", () => resetSection("gallery"));

$("#contactForm").addEventListener("submit", saveContact);

$("#clubForm").addEventListener("submit", saveClub);
$("#clubCancelBtn").addEventListener("click", () => resetSection("club"));

// -----------------------------
// Auth state
// -----------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    $("#loginError").hidden = true;
    revealLogin(false);
    setAuthenticatedUser(user);
    switchTab("news");
    await loadAll();
  } else {
    revealLogin(true);
  }
});

// Initial UI defaults
revealLogin(true);
$("#statusMsg").hidden = true;
$("#newsCancelBtn").hidden = true;
$("#councilCancelBtn").hidden = true;
$("#principalCancelBtn").hidden = true;
$("#galleryCancelBtn").hidden = true;
$("#clubCancelBtn").hidden = true;
$("#councilRole").innerHTML = COUNCIL_ROLES.map((role) => `<option>${role}</option>`).join("");
$("#galleryCategory").innerHTML = CATEGORIES.map((category) => `<option>${category}</option>`).join("");
$("#loginError").hidden = true;
