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
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "./firebase-config.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const COLLECTIONS = {
  news: "news",
  council: "executiveCouncil",
  principals: "principals",
  gallery: "galleryPhotos",
  clubs: "clubs",
  leadership: { collection: "leadershipMessages", doc: "main" },
  contact: { collection: "contactInfo", doc: "main" }
};

const COUNCIL_ROLES = [
  "Senior Prefect (Boy)",
  "Senior Prefect (Girl)",
  "Assistant Senior Prefect",
  "Social Prefect",
  "Sports Prefect",
  "Press Prefect",
  "Other"
];

const GALLERY_CATEGORIES = [
  "Assembly Ground",
  "Classroom Block",
  "Library",
  "Science Laboratory",
  "ICT Room",
  "Sports Field"
];

const state = {
  user: null,
  loadingStatusTimer: null,
  edit: {
    news: null,
    council: null,
    principal: null,
    gallery: null,
    club: null
  },
  photoCache: {
    council: "",
    principal: "",
    gallery: "",
    ldPrincipal: "",
    ldBoy: "",
    ldGirl: ""
  }
};

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function truncate(value, length = 140) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function setBusy(button, busy, label = "Saving…") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    return;
  }
  button.disabled = false;
  button.removeAttribute("aria-busy");
  button.textContent = button.dataset.originalText || button.textContent;
}

function showStatus(message, kind = "success") {
  const el = $("#statusMsg");
  el.textContent = message;
  el.className = `status-msg ${kind}`;
  el.hidden = false;
  clearTimeout(state.loadingStatusTimer);
  state.loadingStatusTimer = setTimeout(() => {
    el.hidden = true;
  }, 4200);
}

function setView(authenticated) {
  $("#loginScreen").hidden = authenticated;
  $("#dashboard").hidden = !authenticated;
}

function setTab(tabName) {
  $$(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  $$(".tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== `tab-${tabName}`;
  });
}

function setSelectOptions(selectId, options) {
  const select = $(`#${selectId}`);
  if (!select) return;
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
}

function clearNewsForm() {
  state.edit.news = null;
  $("#newsEditId").value = "";
  $("#newsTitle").value = "";
  $("#newsDate").value = "";
  $("#newsFeatured").checked = false;
  $("#newsBody").value = "";
  $("#newsFormTitle").textContent = "Add a News Item";
  $("#newsCancelBtn").hidden = true;
}

function clearCouncilForm() {
  state.edit.council = null;
  state.photoCache.council = "";
  $("#councilEditId").value = "";
  $("#councilYear").value = "";
  $("#councilName").value = "";
  $("#councilRole").value = COUNCIL_ROLES[0];
  $("#councilPhoto").value = "";
  $("#councilFormTitle").textContent = "Add a Prefect";
  $("#councilCancelBtn").hidden = true;
}

function clearPrincipalForm() {
  state.edit.principal = null;
  state.photoCache.principal = "";
  $("#principalEditId").value = "";
  $("#principalName").value = "";
  $("#principalYear").value = "";
  $("#principalYearEnded").value = "";
  $("#principalCurrent").checked = false;
  $("#principalPhoto").value = "";
  $("#principalFormTitle").textContent = "Add a Principal";
  $("#principalCancelBtn").hidden = true;
}

function clearGalleryForm() {
  state.edit.gallery = null;
  state.photoCache.gallery = "";
  $("#galleryEditId").value = "";
  $("#galleryCategory").value = GALLERY_CATEGORIES[0];
  $("#galleryCaption").value = "";
  $("#galleryPhoto").value = "";
  $("#galleryFormTitle").textContent = "Add a Gallery Photo";
  $("#galleryCancelBtn").hidden = true;
}

function clearClubForm() {
  state.edit.club = null;
  $("#clubEditId").value = "";
  $("#clubName").value = "";
  $("#clubDesc").value = "";
  $("#clubFormTitle").textContent = "Add a Club";
  $("#clubCancelBtn").hidden = true;
}

function resetSection(section) {
  if (section === "news") clearNewsForm();
  if (section === "council") clearCouncilForm();
  if (section === "principal") clearPrincipalForm();
  if (section === "gallery") clearGalleryForm();
  if (section === "club") clearClubForm();
}

function createActionButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createRow({ title, subtitle = "", thumb = "", actions = [] }) {
  const row = document.createElement("article");
  row.className = "item-row";

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

  const titleEl = document.createElement("div");
  titleEl.className = "t";
  titleEl.innerHTML = title;
  meta.appendChild(titleEl);

  if (subtitle) {
    const subEl = document.createElement("div");
    subEl.className = "s";
    subEl.innerHTML = subtitle;
    meta.appendChild(subEl);
  }

  left.appendChild(meta);

  const right = document.createElement("div");
  right.className = "item-actions";
  actions.forEach((action) => right.appendChild(action));

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function renderList(containerId, items, emptyText, renderItem) {
  const container = $(`#${containerId}`);
  if (!container) return;
  container.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  items.forEach((item) => container.appendChild(renderItem(item)));
}

async function fileToDataUrl(file, maxDimension = 1200, quality = 0.8) {
  if (!file) return null;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        let { width, height } = image;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
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
      image.onerror = () => reject(new Error("Could not process that image."));
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  const approxBytes = Math.round(dataUrl.length * 0.75);
  if (approxBytes > 900000) {
    throw new Error(`That image is still too large after compression (${Math.ceil(approxBytes / 1024)} KB). Use a smaller or simpler photo.`);
  }
  return dataUrl;
}

async function selectedImage(inputId) {
  const input = $("#" + inputId);
  if (!input || !input.files || !input.files.length) return null;
  return fileToDataUrl(input.files[0]);
}

function timeoutPromise(ms, label) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out.`)), ms);
  });
}

async function withTimeout(promise, ms, label) {
  return Promise.race([promise, timeoutPromise(ms, label)]);
}

function collectionRef(name) {
  return collection(db, name);
}

function documentRef(collectionName, id) {
  return doc(db, collectionName, id);
}

async function loadNews() {
  const snapshot = await withTimeout(getDocs(collectionRef(COLLECTIONS.news)), 12000, "News load");
  const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  renderList("newsList", items, "No news items yet.", (item) => {
    const title = `${escapeHtml(item.title || "Untitled")}${item.featured ? " <span class='badge'>Featured</span>" : ""}`;
    const subtitle = `${escapeHtml(formatDate(item.date))}<br>${escapeHtml(truncate(item.body || "", 180))}`;
    return createRow({
      title,
      subtitle,
      actions: [
        createActionButton("Edit", "btn btn-ghost btn-sm", () => editNews(item)),
        createActionButton("Delete", "btn btn-danger btn-sm", () => deleteItem("news", item.id, loadNews))
      ]
    });
  });
}

function editNews(item) {
  state.edit.news = item.id;
  $("#newsEditId").value = item.id;
  $("#newsTitle").value = item.title || "";
  $("#newsDate").value = item.date || "";
  $("#newsFeatured").checked = !!item.featured;
  $("#newsBody").value = item.body || "";
  $("#newsFormTitle").textContent = "Edit News Item";
  $("#newsCancelBtn").hidden = false;
  setTab("news");
}

async function saveNews(event) {
  event.preventDefault();
  const button = $("#newsSaveBtn");
  setBusy(button, true, "Saving…");

  try {
    const payload = {
      title: $("#newsTitle").value.trim(),
      date: $("#newsDate").value,
      featured: $("#newsFeatured").checked,
      body: $("#newsBody").value.trim()
    };

    if (!payload.title) throw new Error("Title is required.");
    if (!payload.body) throw new Error("Details are required.");

    const editId = $("#newsEditId").value.trim();
    if (editId) {
      await updateDoc(documentRef(COLLECTIONS.news, editId), payload);
      showStatus("News item updated.");
    } else {
      await addDoc(collectionRef(COLLECTIONS.news), payload);
      showStatus("News item saved.");
    }

    resetSection("news");
    await loadNews();
  } catch (error) {
    showStatus(`Could not save news: ${error.message}`, "error");
  } finally {
    setBusy(button, false);
  }
}

async function loadCouncil() {
  const snapshot = await withTimeout(getDocs(collectionRef(COLLECTIONS.council)), 12000, "Executive council load");
  const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  items.sort((a, b) => String(b.academicYear || "").localeCompare(String(a.academicYear || "")));

  renderList("councilList", items, "No prefects added yet.", (item) => {
    const title = `${escapeHtml(item.name || "Unnamed")}${item.role === "Senior Prefect (Boy)" || item.role === "Senior Prefect (Girl)" ? " <span class='badge'>Main Role</span>" : ""}`;
    const subtitle = `${escapeHtml(item.role || "")} · ${escapeHtml(item.academicYear || "")}`;
    return createRow({
      thumb: item.photoUrl || "",
      title,
      subtitle,
      actions: [
        createActionButton("Edit", "btn btn-ghost btn-sm", () => editCouncil(item)),
        createActionButton("Delete", "btn btn-danger btn-sm", () => deleteItem(COLLECTIONS.council, item.id, loadCouncil))
      ]
    });
  });
}

function editCouncil(item) {
  state.edit.council = item.id;
  state.photoCache.council = item.photoUrl || "";
  $("#councilEditId").value = item.id;
  $("#councilYear").value = item.academicYear || "";
  $("#councilName").value = item.name || "";
  $("#councilRole").value = item.role || COUNCIL_ROLES[0];
  $("#councilPhoto").value = "";
  $("#councilFormTitle").textContent = "Edit Prefect";
  $("#councilCancelBtn").hidden = false;
  setTab("council");
}

async function saveCouncil(event) {
  event.preventDefault();
  const button = $("#councilSaveBtn");
  setBusy(button, true, "Saving…");

  try {
    const selectedPhoto = await selectedImage("councilPhoto");
    const payload = {
      academicYear: $("#councilYear").value.trim(),
      name: $("#councilName").value.trim(),
      role: $("#councilRole").value,
      photoUrl: selectedPhoto || state.photoCache.council || ""
    };

    if (!payload.academicYear) throw new Error("Academic year is required.");
    if (!payload.name) throw new Error("Full name is required.");
    if (!payload.role) throw new Error("Role is required.");

    const editId = $("#councilEditId").value.trim();
    if (editId) {
      await updateDoc(documentRef(COLLECTIONS.council, editId), payload);
      showStatus("Prefect updated.");
    } else {
      await addDoc(collectionRef(COLLECTIONS.council), payload);
      showStatus("Prefect saved.");
    }

    resetSection("council");
    await loadCouncil();
  } catch (error) {
    showStatus(`Could not save prefect: ${error.message}`, "error");
  } finally {
    setBusy(button, false);
  }
}

async function loadLeadership() {
  const snapshot = await withTimeout(getDoc(documentRef(COLLECTIONS.leadership.collection, COLLECTIONS.leadership.doc)), 12000, "Leadership load");
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  $("#ldPrincipalName").value = data.principalName || "";
  $("#ldPrincipalMsg").value = data.principalMessage || "";
  $("#ldBoyName").value = data.seniorPrefectBoyName || "";
  $("#ldBoyMsg").value = data.seniorPrefectBoyMessage || "";
  $("#ldGirlName").value = data.seniorPrefectGirlName || "";
  $("#ldGirlMsg").value = data.seniorPrefectGirlMessage || "";
  state.photoCache.ldPrincipal = data.principalPhotoUrl || "";
  state.photoCache.ldBoy = data.seniorPrefectBoyPhotoUrl || "";
  state.photoCache.ldGirl = data.seniorPrefectGirlPhotoUrl || "";
}

async function saveLeadership(event) {
  event.preventDefault();
  const button = $("#leadershipSaveBtn");
  setBusy(button, true, "Saving…");

  try {
    const [principalPhoto, boyPhoto, girlPhoto] = await Promise.all([
      selectedImage("ldPrincipalPhoto"),
      selectedImage("ldBoyPhoto"),
      selectedImage("ldGirlPhoto")
    ]);

    const payload = {
      principalName: $("#ldPrincipalName").value.trim(),
      principalMessage: $("#ldPrincipalMsg").value.trim(),
      principalPhotoUrl: principalPhoto || state.photoCache.ldPrincipal || "",
      seniorPrefectBoyName: $("#ldBoyName").value.trim(),
      seniorPrefectBoyMessage: $("#ldBoyMsg").value.trim(),
      seniorPrefectBoyPhotoUrl: boyPhoto || state.photoCache.ldBoy || "",
      seniorPrefectGirlName: $("#ldGirlName").value.trim(),
      seniorPrefectGirlMessage: $("#ldGirlMsg").value.trim(),
      seniorPrefectGirlPhotoUrl: girlPhoto || state.photoCache.ldGirl || ""
    };

    await setDoc(documentRef(COLLECTIONS.leadership.collection, COLLECTIONS.leadership.doc), payload);
    state.photoCache.ldPrincipal = payload.principalPhotoUrl;
    state.photoCache.ldBoy = payload.seniorPrefectBoyPhotoUrl;
    state.photoCache.ldGirl = payload.seniorPrefectGirlPhotoUrl;
    $("#ldPrincipalPhoto").value = "";
    $("#ldBoyPhoto").value = "";
    $("#ldGirlPhoto").value = "";
    showStatus("Leadership messages saved.");
  } catch (error) {
    showStatus(`Could not save leadership messages: ${error.message}`, "error");
  } finally {
    setBusy(button, false);
  }
}

async function loadPrincipals() {
  const snapshot = await withTimeout(getDocs(collectionRef(COLLECTIONS.principals)), 12000, "Principals load");
  const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  items.sort((a, b) => String(b.yearStarted || "").localeCompare(String(a.yearStarted || "")));

  renderList("principalList", items, "No principal records yet.", (item) => {
    const title = `${escapeHtml(item.name || "Unnamed")}${item.isCurrent ? " <span class='badge'>Current</span>" : ""}`;
    const range = item.isCurrent
      ? `${item.yearStarted || "?"} - Till date`
      : `${item.yearStarted || "?"} - ${item.yearEnded || "?"}`;
    const subtitle = escapeHtml(range);
    return createRow({
      thumb: item.photoUrl || "",
      title,
      subtitle,
      actions: [
        createActionButton("Edit", "btn btn-ghost btn-sm", () => editPrincipal(item)),
        createActionButton("Delete", "btn btn-danger btn-sm", () => deleteItem(COLLECTIONS.principals, item.id, loadPrincipals))
      ]
    });
  });
}

function editPrincipal(item) {
  state.edit.principal = item.id;
  state.photoCache.principal = item.photoUrl || "";
  $("#principalEditId").value = item.id;
  $("#principalName").value = item.name || "";
  $("#principalYear").value = item.yearStarted || "";
  $("#principalYearEnded").value = item.yearEnded || "";
  $("#principalCurrent").checked = !!item.isCurrent;
  $("#principalPhoto").value = "";
  $("#principalFormTitle").textContent = "Edit Principal";
  $("#principalCancelBtn").hidden = false;
  setTab("principals");
}

async function savePrincipals(event) {
  event.preventDefault();
  const button = $("#principalSaveBtn");
  setBusy(button, true, "Saving…");

  try {
    const selectedPhoto = await selectedImage("principalPhoto");
    const isCurrent = $("#principalCurrent").checked;
    const payload = {
      name: $("#principalName").value.trim(),
      yearStarted: $("#principalYear").value.trim(),
      yearEnded: isCurrent ? "" : $("#principalYearEnded").value.trim(),
      isCurrent,
      photoUrl: selectedPhoto || state.photoCache.principal || ""
    };

    if (!payload.name) throw new Error("Name is required.");
    if (!payload.yearStarted) throw new Error("Year started is required.");

    const editId = $("#principalEditId").value.trim();
    if (editId) {
      await updateDoc(documentRef(COLLECTIONS.principals, editId), payload);
      showStatus("Principal updated.");
    } else {
      await addDoc(collectionRef(COLLECTIONS.principals), payload);
      showStatus("Principal saved.");
    }

    resetSection("principal");
    await loadPrincipals();
  } catch (error) {
    showStatus(`Could not save principal: ${error.message}`, "error");
  } finally {
    setBusy(button, false);
  }
}

async function loadGallery() {
  const snapshot = await withTimeout(getDocs(collectionRef(COLLECTIONS.gallery)), 12000, "Gallery load");
  const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  items.sort((a, b) => String(a.category || "").localeCompare(String(b.category || "")));

  renderList("galleryList", items, "No gallery photos yet.", (item) => {
    return createRow({
      thumb: item.photoUrl || "",
      title: escapeHtml(item.category || "Uncategorized"),
      subtitle: escapeHtml(item.caption || ""),
      actions: [
        createActionButton("Edit", "btn btn-ghost btn-sm", () => editGallery(item)),
        createActionButton("Delete", "btn btn-danger btn-sm", () => deleteItem(COLLECTIONS.gallery, item.id, loadGallery))
      ]
    });
  });
}

function editGallery(item) {
  state.edit.gallery = item.id;
  state.photoCache.gallery = item.photoUrl || "";
  $("#galleryEditId").value = item.id;
  $("#galleryCategory").value = item.category || GALLERY_CATEGORIES[0];
  $("#galleryCaption").value = item.caption || "";
  $("#galleryPhoto").value = "";
  $("#galleryFormTitle").textContent = "Edit Gallery Photo";
  $("#galleryCancelBtn").hidden = false;
  setTab("gallery");
}

async function saveGallery(event) {
  event.preventDefault();
  const button = $("#gallerySaveBtn");
  setBusy(button, true, "Saving…");

  try {
    const selectedPhoto = await selectedImage("galleryPhoto");
    const payload = {
      category: $("#galleryCategory").value,
      caption: $("#galleryCaption").value.trim(),
      photoUrl: selectedPhoto || state.photoCache.gallery || ""
    };

    if (!payload.category) throw new Error("Category is required.");
    if (!payload.photoUrl) throw new Error("Photo is required.");

    const editId = $("#galleryEditId").value.trim();
    if (editId) {
      await updateDoc(documentRef(COLLECTIONS.gallery, editId), payload);
      showStatus("Gallery photo updated.");
    } else {
      await addDoc(collectionRef(COLLECTIONS.gallery), payload);
      showStatus("Gallery photo saved.");
    }

    resetSection("gallery");
    await loadGallery();
  } catch (error) {
    showStatus(`Could not save gallery photo: ${error.message}`, "error");
  } finally {
    setBusy(button, false);
  }
}

async function loadContact() {
  const snapshot = await withTimeout(getDoc(documentRef(COLLECTIONS.contact.collection, COLLECTIONS.contact.doc)), 12000, "Contact load");
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  $("#contactEmail").value = data.email || "";
  $("#contactPhone").value = data.phone || "";
  $("#contactFacebook").value = data.facebook || "";
  $("#contactInstagram").value = data.instagram || "";
}

async function saveContact(event) {
  event.preventDefault();
  const button = $("#contactSaveBtn");
  setBusy(button, true, "Saving…");

  try {
    const payload = {
      email: $("#contactEmail").value.trim(),
      phone: $("#contactPhone").value.trim(),
      facebook: $("#contactFacebook").value.trim(),
      instagram: $("#contactInstagram").value.trim()
    };

    await setDoc(documentRef(COLLECTIONS.contact.collection, COLLECTIONS.contact.doc), payload);
    showStatus("Contact details saved.");
  } catch (error) {
    showStatus(`Could not save contact details: ${error.message}`, "error");
  } finally {
    setBusy(button, false);
  }
}

async function loadClubs() {
  const snapshot = await withTimeout(getDocs(collectionRef(COLLECTIONS.clubs)), 12000, "Clubs load");
  const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  renderList("clubList", items, "No clubs added yet.", (item) => {
    return createRow({
      title: escapeHtml(item.name || "Unnamed Club"),
      subtitle: escapeHtml(item.desc || ""),
      actions: [
        createActionButton("Edit", "btn btn-ghost btn-sm", () => editClub(item)),
        createActionButton("Delete", "btn btn-danger btn-sm", () => deleteItem(COLLECTIONS.clubs, item.id, loadClubs))
      ]
    });
  });
}

function editClub(item) {
  state.edit.club = item.id;
  $("#clubEditId").value = item.id;
  $("#clubName").value = item.name || "";
  $("#clubDesc").value = item.desc || "";
  $("#clubFormTitle").textContent = "Edit Club";
  $("#clubCancelBtn").hidden = false;
  setTab("clubs");
}

async function saveClub(event) {
  event.preventDefault();
  const button = $("#clubSaveBtn");
  setBusy(button, true, "Saving…");

  try {
    const payload = {
      name: $("#clubName").value.trim(),
      desc: $("#clubDesc").value.trim()
    };

    if (!payload.name) throw new Error("Club name is required.");

    const editId = $("#clubEditId").value.trim();
    if (editId) {
      await updateDoc(documentRef(COLLECTIONS.clubs, editId), payload);
      showStatus("Club updated.");
    } else {
      await addDoc(collectionRef(COLLECTIONS.clubs), payload);
      showStatus("Club saved.");
    }

    resetSection("club");
    await loadClubs();
  } catch (error) {
    showStatus(`Could not save club: ${error.message}`, "error");
  } finally {
    setBusy(button, false);
  }
}

async function deleteItem(collectionName, id, reloadFn) {
  const ok = window.confirm("Delete this item? This cannot be undone.");
  if (!ok) return;

  try {
    await deleteDoc(documentRef(collectionName, id));
    showStatus("Item deleted.");
    await reloadFn();
  } catch (error) {
    showStatus(`Could not delete item: ${error.message}`, "error");
  }
}

async function loadAllData() {
  const tasks = [
    loadNews(),
    loadCouncil(),
    loadLeadership(),
    loadPrincipals(),
    loadGallery(),
    loadContact(),
    loadClubs()
  ];

  const results = await Promise.allSettled(tasks);
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) {
    const firstError = failed[0].reason?.message || "One or more sections could not load.";
    showStatus(firstError, "error");
  }
}

function setAuthenticatedUser(user) {
  state.user = user;
  $("#whoEmail").textContent = user.email || "";
}

function initUI() {
  setSelectOptions("councilRole", COUNCIL_ROLES);
  setSelectOptions("galleryCategory", GALLERY_CATEGORIES);
  setView(false);
  setTab("news");
  $("#statusMsg").hidden = true;
  $("#loginError").hidden = true;
  $("#newsCancelBtn").hidden = true;
  $("#councilCancelBtn").hidden = true;
  $("#principalCancelBtn").hidden = true;
  $("#galleryCancelBtn").hidden = true;
  $("#clubCancelBtn").hidden = true;
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#loginBtn");
  setBusy(button, true, "Signing in…");
  $("#loginError").hidden = true;

  try {
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    if (!email || !password) {
      throw new Error("Enter your email and password.");
    }

    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const message = error?.message || "Could not sign in.";
    $("#loginError").textContent = message;
    $("#loginError").hidden = false;
  } finally {
    setBusy(button, false);
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    showStatus(`Could not sign out: ${error.message}`, "error");
  }
});

$$(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});

$("#newsForm").addEventListener("submit", saveNews);
$("#newsCancelBtn").addEventListener("click", () => clearNewsForm());
$("#councilForm").addEventListener("submit", saveCouncil);
$("#councilCancelBtn").addEventListener("click", () => clearCouncilForm());
$("#leadershipForm").addEventListener("submit", saveLeadership);
$("#principalForm").addEventListener("submit", savePrincipals);
$("#principalCancelBtn").addEventListener("click", () => clearPrincipalForm());
$("#galleryForm").addEventListener("submit", saveGallery);
$("#galleryCancelBtn").addEventListener("click", () => clearGalleryForm());
$("#contactForm").addEventListener("submit", saveContact);
$("#clubForm").addEventListener("submit", saveClub);
$("#clubCancelBtn").addEventListener("click", () => clearClubForm());

window.addEventListener("unhandledrejection", (event) => {
  showStatus(event.reason?.message || "An unexpected error occurred.", "error");
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    state.user = null;
    setView(false);
    return;
  }

  setView(true);
  setAuthenticatedUser(user);
  setTab("news");
  void loadAllData();
});

initUI();
