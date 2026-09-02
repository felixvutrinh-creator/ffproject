const grid = document.getElementById("grid");

// platzhalter 
const testLayout = [
  { id: "1", span: "2 / 4" },
  { id: "2", span: "4 / 4" },
  { id: "3", span: "2 / 2" },
];

testLayout.forEach(item => {
  const el = document.createElement("div");
  el.className = "widget";
  el.textContent = `Widget ${item.id}`;
  grid.appendChild(el);
});