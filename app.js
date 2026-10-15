// Using standard function names completely stops the markdown backslash bug
function getElement(id) {
  return document.getElementById(id);
}

let cards = [];
let i = 0;
let typingTimeout = null;

// Global tracking storage variables for your thesis scope indicators
let selectedGrade = "Grade 11";
let selectedStrand = "STEM";

// Display selected file name dynamically when uploaded
getElement("image").addEventListener("change", (e) => {
  const file = e.target.files[0];
  getElement("file-name").textContent = file ? file.name : "No file selected";
});

// Convert image file safely to a clean Base64 format string
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Extract raw base64 data stream string
    reader.onerror = (error) => reject(error);
  });
}

// Typing visual speed controller logic
function typeWriter(element, text, speed = 15) {
  element.textContent = "";
  let index = 0;
  
  if (typingTimeout) clearTimeout(typingTimeout);

  function type() {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index++;
      typingTimeout = setTimeout(type, speed);
    }
  }
  type();
}

// Interactive Grade Level Selector Engine
document.querySelectorAll("#grade-container .selector-badge").forEach(badge => {
  badge.addEventListener("click", () => {
    document.querySelectorAll("#grade-container .selector-badge").forEach(b => b.classList.remove("active"));
    badge.classList.add("active");
    selectedGrade = badge.getAttribute("data-value");
  });
});

// Interactive Academic Strand Selector Engine
document.querySelectorAll("#strand-container .selector-badge").forEach(badge => {
  badge.addEventListener("click", () => {
    document.querySelectorAll("#strand-container .selector-badge").forEach(b => b.classList.remove("active"));
    badge.classList.add("active");
    selectedStrand = badge.getAttribute("data-value");
  });
});

getElement("generate").addEventListener("click", async () => {
  const notes = getElement("notes").value;
  const count = getElement("count").value;
  const imageFiles = getElement("image").files;
  
  getElement("status").textContent = "Generating flashcards...";
  getElement("generate").disabled = true;

  try {
    let base64Image = null;
    let mimeType = null;

    if (imageFiles && imageFiles.length > 0) {
      base64Image = await fileToBase64(imageFiles[0]);
      mimeType = imageFiles[0].type;
    }

    // Sends the selected grade and track alongside your inputs to the server endpoint
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        notes, 
        count,
        image: base64Image,
        mimeType: mimeType,
        gradeLevel: selectedGrade,
        academicStrand: selectedStrand
      }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    cards = data.cards;
    i = 0;
    getElement("study").classList.remove("hidden");
    getElement("status").textContent = `Done! ${cards.length} cards ready.`;
    show();
  } catch (err) {
    getElement("status").textContent = "Error: " + err.message;
  } finally {
    getElement("generate").disabled = false;
  }
});

function show() {
  getElement("card").classList.remove("flipped");

  const front = getElement("front");
  const questionLines = cards[i].question.split(/\r?\n/);
  const optionPattern = /^\s*[A-D][.)]\s+/;
  const firstOptionIndex = questionLines.findIndex(line => optionPattern.test(line));

  front.replaceChildren();
  front.classList.toggle("multiple-choice", firstOptionIndex !== -1);

  if (firstOptionIndex === -1) {
    typeWriter(front, cards[i].question);
  } else {
    const question = document.createElement("div");
    question.className = "question-text";
    front.append(question);
    typeWriter(question, questionLines.slice(0, firstOptionIndex).join("\n").trim());

    const options = document.createElement("div");
    options.className = "choice-options";
    questionLines.slice(firstOptionIndex).filter(line => optionPattern.test(line)).forEach(line => {
      const option = document.createElement("div");
      option.className = "choice-option";
      option.textContent = line.trim();
      options.append(option);
    });
    front.append(options);
  }

  getElement("back").textContent = cards[i].answer;
  
  getElement("counter").textContent = `Card ${i + 1} of ${cards.length}`;
  getElement("bar").style.width = ((i + 1) / cards.length) * 100 + "%";
}

getElement("card").addEventListener("click", () => getElement("card").classList.toggle("flipped"));
getElement("next").addEventListener("click", () => { i = (i + 1) % cards.length; show(); });
getElement("prev").addEventListener("click", () => { i = (i - 1 + cards.length) % cards.length; show(); });
getElement("shuffle").addEventListener("click", () => {
  cards.sort(() => Math.random() - 0.5);
  i = 0;
  show();
});

document.addEventListener("keydown", (e) => {
  if (!cards.length || e.target.tagName === "TEXTAREA") return;
  if (e.code === "Space") { e.preventDefault(); getElement("card").classList.toggle("flipped"); }
  if (e.key === "ArrowRight") getElement("next").click();
  if (e.key === "ArrowLeft") getElement("prev").click();
});
