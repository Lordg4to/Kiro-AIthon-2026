/* ===== Avanza conmigo · lógica =====
   Compañera de estudio para becarias que avanzan lento o dejaron de avanzar.
   Plan personalizado según estado de ánimo + tiempo disponible. Datos en localStorage. */

"use strict";

/* ---------- Almacenamiento local ---------- */
const Store = {
  get(clave, porDefecto) {
    try {
      const raw = localStorage.getItem(clave);
      return raw ? JSON.parse(raw) : porDefecto;
    } catch (e) {
      console.warn("No se pudo leer", clave, e);
      return porDefecto;
    }
  },
  set(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); }
    catch (e) { console.warn("No se pudo guardar", clave, e); }
  },
  remove(clave) { localStorage.removeItem(clave); }
};

/* ---------- Estado de la app ---------- */
let animoSeleccionado = null;   // ánimo elegido en el picker grande
let moodActual = null;          // ánimo del plan actual (para recalcular por tiempo)
let tiempoSel = "flexible";     // opción de tiempo seleccionada

/* ---------- Respuestas de apoyo según el ánimo ---------- */
const respuestasAnimo = {
  feliz: "Qué bueno sentir energía. Aprovéchala sin pasarte: dos bloques bien hechos valen más que cinco a la carrera.",
  tranquila: "La calma es el mejor estado para aprender. Vamos a tu ritmo, sin prisa.",
  cansada: "Estar cansada es real, no es excusa. Hoy el objetivo no es avanzar mucho, es no soltar el hilo.",
  triste: "Lo que sientes importa. Los días difíciles no se miden en avance, se miden en no rendirse. Y ya estás aquí.",
  ansiosa: "La ansiedad miente: te hace creer que todo urge. No todo urge. Vamos una tarea a la vez."
};

/* ---------- EL PLAN PERSONALIZADO SEGÚN ÁNIMO ----------
   Cada estado de ánimo define duración base, enfoque, tareas y un
   "primer paso" muy pequeño para vencer la fricción de empezar.
   "techo" es el máximo de bloques que recomendamos para ese ánimo,
   sin importar cuánto tiempo tenga la becaria (protege contra el exceso). */
const planes = {
  feliz: {
    emoji: "⚡",
    nombre: "Plan con brújula",
    baseline: "Para cuando tienes energía y la mente despierta",
    foco: 30, descanso: 8, bloques: 3, techo: 3,
    mensaje: "Tienes energía hoy, y eso vale oro. La usamos para avanzar en lo más atrasado, pero ojo: el objetivo no es agotarte, es cerrar bien los bloques que alcances.",
    primerPaso: "Abre el material de tu materia más atrasada y lee solo el objetivo o título de hoy. Nada más. Con eso ya empezaste.",
    tareas: [
      "Avanza en la materia que más se te ha atrasado",
      "Resuelve ejercicios de práctica de esa materia",
      "Organiza y planifica lo que viene esta semana"
    ]
  },
  tranquila: {
    emoji: "🙂",
    nombre: "Plan a tu ritmo",
    baseline: "Para cuando estás serena y dispuesta",
    foco: 25, descanso: 5, bloques: 3, techo: 4,
    mensaje: "Vas bien. Sin prisa pero sin pausa. Hoy equilibramos repasar lo que ya sabes con dar un paso nuevo.",
    primerPaso: "Elige una materia, abre por donde lo dejaste y lee solo la última línea que escribiste.",
    tareas: [
      "Repasa un tema que ya dominas un poco (refuerza confianza)",
      "Avanza un punto nuevo de ese tema",
      "Revisa y ordena tus apuntes"
    ]
  },
  cansada: {
    emoji: "😮‍💨",
    nombre: "Plan ligero",
    baseline: "Para cuando el cuerpo y la mente piden tregua",
    foco: 15, descanso: 5, bloques: 2, techo: 2,
    mensaje: "Estar cansada es real, no es flojera. Hoy no se trata de avanzar mucho, se trata de no soltar el hilo. 15 minutos ya cuentan como un día estudiado.",
    primerPaso: "Siéntate solo 15 minutos. Si después quieres seguir, genial; si no, ya lograste sostener el hábito y eso protege tu beca.",
    tareas: [
      "Repasa algo que ya sabes (nada nuevo ni difícil hoy)",
      "Lee algo fácil y corto, o ve un video breve de tu materia",
      "Solo organiza tu espacio o apuntes"
    ]
  },
  triste: {
    emoji: "🌧️",
    nombre: "Plan de un solo paso",
    baseline: "Para cuando el ánimo está en el suelo",
    foco: 10, descanso: 5, bloques: 1, techo: 1,
    mensaje: "Los días tristes no se miden en avance, se miden en no rendirse. Si hoy solo logras una cosa pequeña, ya estás avanzando. Y estar aquí, leyendo esto, ya es empezar.",
    primerPaso: "Elige la tarea más pequeña que exista. Solo esa. Leer 2 páginas u ordenar apuntes ya vale. No te exijas más hoy.",
    tareas: [
      "Una sola cosa pequeña: leer 2 páginas, ordenar apuntes o ver un video corto",
      "Si te sobra energía, anota qué te gustaría hacer mañana (sin compromiso)"
    ]
  },
  ansiosa: {
    emoji: "🌊",
    nombre: "Plan que calma",
    baseline: "Para cuando la cabeza va muy rápido",
    foco: 20, descanso: 7, bloques: 2, techo: 2,
    mensaje: "La ansiedad miente: te hace creer que todo urge y que no das abasto. No todo urge. Hoy necesitamos que el cuerpo sienta que retoma el control, una tarea a la vez.",
    primerPaso: "Respira 3 veces lento (inhala 4, sostén 4, exhala 6). Luego abre la tarea más fácil que tengas. Solo esa.",
    tareas: [
      "Empieza por la tarea más fácil que tengas (recuperar control)",
      "Anota en un papel lo que te preocupa para sacarlo de la cabeza",
      "Avanza un poco en algo mediano, si te alcanza"
    ]
  }
};

/* ---------- Tiempo disponible + cálculo de plan ----------
   Combina ánimo (define intensidad y techo) con minutos disponibles
   (define cuántos bloques caben hoy). */
const tiempoPresets = { rato: 15, media: 30, hora: 60, par: 120, flexible: null };

function calcularPlan(mood, minDisp) {
  const p = planes[mood];
  let foco = p.foco;
  let descanso = p.descanso;
  let bloques;
  if (minDisp === null) {
    // Sin límite: usar bloques ideales del ánimo
    bloques = p.bloques;
  } else {
    bloques = Math.floor(minDisp / (foco + descanso));
    if (bloques < 1) {
      // No alcanza para una sesión completa: reducir la sesión a lo que haya (mín 5 min)
      foco = Math.max(5, minDisp);
      descanso = Math.max(2, Math.floor(foco / 4));
      bloques = 1;
    }
    bloques = Math.min(bloques, p.techo);   // el ánimo pone un techo protector
    bloques = Math.max(bloques, 1);
  }
  return { foco, descanso, bloques };
}

function notaTiempo(sel, calc) {
  const labels = {
    flexible: "Sin límite de tiempo",
    rato: "Con ~15 min",
    media: "Con ~30 min",
    hora: "Con ~1 hora",
    par: "Con ~2 horas o más"
  };
  let s = labels[sel] + ": ";
  if (calc.bloques === 1) s += "1 bloque bien hecho. Eso ya sostiene tu hábito.";
  else s += calc.bloques + " bloques. Si llegas a la mitad, ya es un buen día.";
  return s;
}

/* ---------- Navegación por pestañas ---------- */
const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));

tabs.forEach((tab) => tab.addEventListener("click", () => activarTab(tab.dataset.tab)));

function activarTab(nombre) {
  tabs.forEach((t) => {
    const activo = t.dataset.tab === nombre;
    t.classList.toggle("is-active", activo);
    t.setAttribute("aria-selected", activo ? "true" : "false");
  });
  panels.forEach((p) => {
    const activo = p.id === "panel-" + nombre;
    p.classList.toggle("is-active", activo);
    p.hidden = !activo;
  });
  if (nombre === "progreso") renderProgreso();
}

/* ---------- Saludo según la hora ---------- */
function saludar() {
  const h = new Date().getHours();
  let saludo = "Hola";
  if (h < 12) saludo = "Buenos días";
  else if (h < 19) saludo = "Buenas tardes";
  else saludo = "Buenas noches";
  document.getElementById("saludo").textContent = saludo + " 🌱";
}
saludar();

/* ---------- Frase del día ---------- */
const frases = [
  "El abandono no empieza el día que dejas de ir, empieza el día que dejas de creer que puedes. Aquí volvemos a creer, despacio.",
  "No tienes que ver toda la escalera. Solo da el primer paso.",
  "El avance lento también es avance. Lo que no puedes es confundir lento con detenido.",
  "Cuidarte también es estudiar. Descansar no es perder la beca, es sostenerla.",
  "Una página hoy es más que diez páginas soñadas para mañana.",
  "Tu beca se sostiene con continuidad, no con perfección."
];
document.getElementById("frase-dia").textContent =
  "“" + frases[Math.floor(Math.random() * frases.length)] + "”";

/* ---------- Ánimo: chips rápidos en inicio ---------- */
document.querySelectorAll(".mood-quick .mood-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const mood = chip.dataset.mood;
    document.getElementById("respuesta-animo").textContent = respuestasAnimo[mood];
    guardarAnimo(mood, "");
    aplicarPlan(mood);
    const btnVer = document.getElementById("btn-ver-plan");
    btnVer.hidden = false;
    btnVer.onclick = () => activarTab("plan");
  });
});

/* ---------- Ánimo: picker grande ---------- */
document.querySelectorAll(".mood-option").forEach((opt) => {
  opt.addEventListener("click", () => {
    document.querySelectorAll(".mood-option").forEach((o) => {
      o.setAttribute("aria-checked", "false");
      o.classList.remove("is-selected");
    });
    opt.setAttribute("aria-checked", "true");
    opt.classList.add("is-selected");
    animoSeleccionado = opt.dataset.mood;
  });
});

document.getElementById("btn-guardar-animo").addEventListener("click", () => {
  if (!animoSeleccionado) {
    document.getElementById("respuesta-animo-guardado").textContent =
      "Elige un estado de ánimo primero. Sin prisa.";
    return;
  }
  const nota = document.getElementById("nota-animo").value.trim();
  guardarAnimo(animoSeleccionado, nota);
  aplicarPlan(animoSeleccionado);
  document.getElementById("respuesta-animo-guardado").textContent =
    "Guardado. " + respuestasAnimo[animoSeleccionado];
  document.getElementById("nota-animo").value = "";
  renderHistorialAnimo();
  setTimeout(() => activarTab("plan"), 700);
});

document.getElementById("btn-ir-animo").addEventListener("click", () => activarTab("animo"));
document.getElementById("btn-otro-animo").addEventListener("click", () => activarTab("animo"));

/* ---------- Persistencia de ánimo ---------- */
function guardarAnimo(mood, nota) {
  const historial = Store.get("avanza:animo", []);
  historial.unshift({ mood, nota, fecha: new Date().toISOString() });
  Store.set("avanza:animo", historial.slice(0, 120));
  Store.set("avanza:ultimoAnimo", { mood, fecha: new Date().toISOString() });
}

function renderHistorialAnimo() {
  const cont = document.getElementById("historial-animo");
  const historial = Store.get("avanza:animo", []);
  if (!historial.length) {
    cont.innerHTML = '<p class="muted">Aún no hay registros. Tu primer paso se verá aquí.</p>';
    return;
  }
  const emojis = { feliz: "⚡", tranquila: "🙂", cansada: "😮‍💨", triste: "🌧️", ansiosa: "🌊" };
  cont.innerHTML = historial.map((r) => {
    const f = new Date(r.fecha);
    const cuando = f.toLocaleDateString("es", { day: "numeric", month: "short" }) +
      " " + f.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    const nota = r.nota ? `<span class="note">· ${escapar(r.nota)}</span>` : "";
    return `<div class="mood-row"><span aria-hidden="true">${emojis[r.mood] || "•"}</span><span class="when">${cuando}</span>${nota}</div>`;
  }).join("");
}

document.getElementById("btn-borrar-animo").addEventListener("click", () => {
  if (confirm("¿Borrar todo el historial de ánimo? Esta acción no se puede deshacer.")) {
    Store.remove("avanza:animo");
    Store.remove("avanza:ultimoAnimo");
    renderHistorialAnimo();
  }
});

/* ---------- APLICAR EL PLAN PERSONALIZADO ---------- */
function aplicarPlan(mood) {
  const plan = planes[mood];
  if (!plan) return;

  document.getElementById("plan-vacio").hidden = true;
  document.getElementById("plan-contenido").hidden = false;

  moodActual = mood;

  document.getElementById("plan-emoji").textContent = plan.emoji;
  document.getElementById("plan-nombre").textContent = plan.nombre;
  document.getElementById("plan-baseline").textContent = plan.baseline;
  document.getElementById("plan-mensaje").textContent = plan.mensaje;
  document.getElementById("plan-primer-paso").textContent = plan.primerPaso;

  // Calcular sesiones/bloques según ánimo + tiempo disponible
  const minDisp = tiempoPresets[tiempoSel];
  const calc = calcularPlan(mood, minDisp);
  document.getElementById("plan-foco").textContent = calc.foco;
  document.getElementById("plan-descanso").textContent = calc.descanso;
  document.getElementById("plan-bloques").textContent = calc.bloques;
  document.getElementById("plan-tiempo-note").textContent = notaTiempo(tiempoSel, calc);

  // Sincronizar píldoras de tiempo con la selección actual
  document.querySelectorAll(".time-pill").forEach((p) =>
    p.classList.toggle("is-active", p.dataset.tiempo === tiempoSel));

  // Renderizar tareas con casillas (guardamos su estado por día)
  const tareasEstado = Store.get("avanza:tareasPlan", {});
  const claveHoy = fechaHoy();
  const ul = document.getElementById("plan-tareas");
  ul.innerHTML = plan.tareas.map((t, i) => {
    const done = tareasEstado[claveHoy] && tareasEstado[claveHoy][mood] && tareasEstado[claveHoy][mood][i];
    return `<li class="plan-tarea ${done ? "done" : ""}>
      <input type="checkbox" data-mood="${mood}" data-i="${i}" ${done ? "checked" : ""} aria-label="${escapar(t)}">
      <span class="text">${escapar(t)}</span>
    </li>`;
  }).join("");

  ul.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const m = cb.dataset.mood;
      const i = parseInt(cb.dataset.i, 10);
      const estados = Store.get("avanza:tareasPlan", {});
      if (!estados[claveHoy]) estados[claveHoy] = {};
      if (!estados[claveHoy][m]) estados[claveHoy][m] = {};
      estados[claveHoy][m][i] = cb.checked;
      Store.set("avanza:tareasPlan", estados);
      cb.closest(".plan-tarea").classList.toggle("done", cb.checked);
      if (cb.checked) notificar("Tarea completada. Cada una cuenta. 🌱");
    });
  });

  // Configurar el temporizador con los valores calculados
  timerFocoMin = calc.foco;
  timerDescansoMin = calc.descanso;
  setModo("foco");

  document.getElementById("timer-msg").textContent =
    "Plan listo. Cuando puedas, presiona \"Empezar la sesión\" abajo. Si hoy no puedes, también está bien.";
}

/* Recalcular el plan cuando cambia el tiempo disponible */
function recalcularTiempo() {
  if (!moodActual) return;
  const minDisp = tiempoPresets[tiempoSel];
  const calc = calcularPlan(moodActual, minDisp);
  document.getElementById("plan-foco").textContent = calc.foco;
  document.getElementById("plan-descanso").textContent = calc.descanso;
  document.getElementById("plan-bloques").textContent = calc.bloques;
  document.getElementById("plan-tiempo-note").textContent = notaTiempo(tiempoSel, calc);
  timerFocoMin = calc.foco;
  timerDescansoMin = calc.descanso;
  if (!timer.corriendo) setModo(timer.modo);
}

document.querySelectorAll(".time-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".time-pill").forEach((p) => p.classList.remove("is-active"));
    pill.classList.add("is-active");
    tiempoSel = pill.dataset.tiempo;
    recalcularTiempo();
  });
});

document.getElementById("btn-empezar-plan").addEventListener("click", () => {
  setModo("foco");
  iniciar();
  document.querySelector(".card-timer").scrollIntoView({ behavior: "smooth", block: "center" });
});

/* ---------- Temporizador Pomodoro ---------- */
let timerFocoMin = 25;
let timerDescansoMin = 5;
const timer = { modo: "foco", segundosRestantes: 25 * 60, corriendo: false, intervalo: null };

function fmt(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function actualizarDisplay() {
  document.getElementById("tiempo").textContent = fmt(timer.segundosRestantes);
  document.title = (timer.corriendo ? "⏳ " : "") + fmt(timer.segundosRestantes) + " · Avanza conmigo";
}

function setModo(modo) {
  timer.modo = modo;
  const minutos = modo === "foco" ? timerFocoMin : timerDescansoMin;
  timer.segundosRestantes = minutos * 60;
  detener();
  actualizarDisplay();
  document.querySelectorAll(".mode-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === modo));
  document.getElementById("timer-msg").textContent = modo === "foco"
    ? "Concentrémonos un rato. Si te distraes, vuelve sin culpa."
    : "Descanso de verdad: estira, respira, mira lejos. Te lo ganaste.";
}

document.querySelectorAll(".mode-btn").forEach((b) => b.addEventListener("click", () => setModo(b.dataset.mode)));

function iniciar() {
  if (timer.corriendo) return;
  timer.corriendo = true;
  document.getElementById("btn-iniciar").disabled = true;
  document.getElementById("btn-pausar").disabled = false;
  timer.intervalo = setInterval(tic, 1000);
}

function detener() {
  timer.corriendo = false;
  clearInterval(timer.intervalo);
  document.getElementById("btn-iniciar").disabled = false;
  document.getElementById("btn-pausar").disabled = true;
}

function tic() {
  timer.segundosRestantes--;
  actualizarDisplay();
  if (timer.segundosRestantes <= 0) {
    detener();
    completarSesion();
  }
}

function completarSesion() {
  if (timer.modo === "foco") {
    const hoy = fechaHoy();
    const sesiones = Store.get("avanza:sesiones", {});
    sesiones[hoy] = (sesiones[hoy] || 0) + 1;
    Store.set("avanza:sesiones", sesiones);
    const minutos = Store.get("avanza:minutos", {});
    minutos[hoy] = (minutos[hoy] || 0) + timerFocoMin;
    Store.set("avanza:minutos", minutos);
    document.getElementById("sesiones-hoy").textContent = sesiones[hoy] || 0;
    document.getElementById("timer-msg").textContent =
      "¡Bloque completado! Eso sostiene tu beca. Ahora descansa, te lo ganaste.";
    setModo("descanso");
    notificar("Bloque completado. Descansa, te lo ganaste. 🌱");
    actualizarStreakInicio();
  } else {
    document.getElementById("timer-msg").textContent =
      "Descanso terminado. ¿Listo para otro bloque? Si no, está bien también.";
    setModo("foco");
    notificar("El descanso terminó.");
  }
}

document.getElementById("btn-iniciar").addEventListener("click", iniciar);
document.getElementById("btn-pausar").addEventListener("click", () => {
  detener();
  document.getElementById("timer-msg").textContent = "Pausado. Vuelve cuando quieras, sin presión.";
});
document.getElementById("btn-reiniciar").addEventListener("click", () => {
  detener();
  setModo(timer.modo);
});

/* ---------- Utilidades de fecha ---------- */
function fechaHoy() { return new Date().toISOString().slice(0, 10); }

/* ---------- Racha en inicio ---------- */
function actualizarStreakInicio() {
  const sesiones = Store.get("avanza:sesiones", {});
  const hoy = new Date();
  let dias = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() - i);
    const clave = d.toISOString().slice(0, 10);
    if (sesiones[clave]) dias++;
  }
  document.getElementById("streak-num").textContent = dias;

  const cont = document.getElementById("streak-dots");
  cont.innerHTML = "";
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy); d.setDate(hoy.getDate() - i);
    const clave = d.toISOString().slice(0, 10);
    const dot = document.createElement("span");
    dot.className = "streak-dot" + (sesiones[clave] ? " is-active" : "");
    cont.appendChild(dot);
  }

  const msg = document.getElementById("streak-msg");
  if (dias >= 5) msg.textContent = "Casi una semana completa. Esto es lo que sostiene una beca. 💪";
  else if (dias >= 3) msg.textContent = "Vas agarrando el ritmo. El hábito empieza a afianzarse.";
  else if (dias >= 1) msg.textContent = "El hábito se construye con días pequeños, no con días perfectos.";
  else msg.textContent = "Hoy puede ser el primer día. Un solo bloque basta para empezar.";
}

/* ---------- Progreso ---------- */
function renderProgreso() {
  const sesiones = Store.get("avanza:sesiones", {});
  const minutos = Store.get("avanza:minutos", {});
  const hoy = new Date();
  let sesSemana = 0, minSemana = 0, diasSemana = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() - i);
    const clave = d.toISOString().slice(0, 10);
    if (sesiones[clave]) {
      sesSemana += sesiones[clave];
      diasSemana++;
    }
    minSemana += minutos[clave] || 0;
  }
  document.getElementById("stat-sesiones").textContent = sesSemana;
  document.getElementById("stat-dias").textContent = diasSemana;
  document.getElementById("stat-minutos").textContent = minSemana;

  const heat = document.getElementById("heatmap");
  heat.innerHTML = "";
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoy); d.setDate(hoy.getDate() - i);
    const clave = d.toISOString().slice(0, 10);
    const n = sesiones[clave] || 0;
    let lvl = "";
    if (n >= 3) lvl = "lvl3";
    else if (n === 2) lvl = "lvl2";
    else if (n === 1) lvl = "lvl1";
    const cell = document.createElement("span");
    cell.className = "heat-cell " + lvl;
    cell.title = d.toLocaleDateString("es", { day: "numeric", month: "short" }) + ": " + n + " sesión(es)";
    heat.appendChild(cell);
  }

  const pm = document.getElementById("progreso-msg");
  if (diasSemana >= 5) pm.textContent = "Esta semana estás sólida. La constancia es tu mejor aliada.";
  else if (diasSemana >= 2) pm.textContent = "Vas sumando días. Eso es exactamente lo contrario al abandono.";
  else pm.textContent = "Cada cuadrito con color es un día que no soltaste el hilo. Empieza pequeño, empieza hoy.";
}

/* ---------- Diario ---------- */
const promptsDiario = [
  "¿Qué se siente difícil hoy y qué te ayudaría un poco?",
  "¿Qué cosa pequeña lograste hoy, aunque parezca mínima?",
  "¿Qué te preocupa de tu beca y qué paso pequeño podría aliviarlo?",
  "Si tu yo del futuro te escribiera, ¿qué te diría sobre este momento?",
  "¿Qué pensamiento se repite en tu cabeza y cómo lo pondrías en palabras?",
  "¿De qué te sientes orgullosa, aunque cueste verlo?"
];

document.getElementById("btn-prompt").addEventListener("click", () => {
  const p = promptsDiario[Math.floor(Math.random() * promptsDiario.length)];
  document.getElementById("diario-texto").placeholder = p + " Escribe aquí…";
  document.getElementById("diario-texto").focus();
});

document.getElementById("btn-guardar-diario").addEventListener("click", () => {
  const titulo = document.getElementById("diario-titulo").value.trim();
  const texto = document.getElementById("diario-texto").value.trim();
  if (!texto) return;
  const entradas = Store.get("avanza:diario", []);
  entradas.unshift({ titulo, texto, fecha: new Date().toISOString() });
  Store.set("avanza:diario", entradas);
  document.getElementById("diario-titulo").value = "";
  document.getElementById("diario-texto").value = "";
  renderDiario();
});

function renderDiario() {
  const cont = document.getElementById("lista-diario");
  const entradas = Store.get("avanza:diario", []);
  if (!entradas.length) {
    cont.innerHTML = '<p class="muted">Aún no hay entradas. Tu primera página te espera.</p>';
    return;
  }
  cont.innerHTML = entradas.map((e, i) => {
    const f = new Date(e.fecha);
    const cuando = f.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) +
      " · " + f.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    const titulo = e.titulo ? `<h4 class="e-title">${escapar(e.titulo)}</h4>` : "";
    return `<div class="diario-entry"><div class="meta">${cuando}</div>${titulo}<p class="e-body">${escapar(e.texto)}</p><button class="del" data-i="${i}">Eliminar</button></div>`;
  }).join("");

  cont.querySelectorAll(".del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.i, 10);
      if (confirm("¿Eliminar esta entrada del diario?")) {
        const entradas = Store.get("avanza:diario", []);
        entradas.splice(i, 1);
        Store.set("avanza:diario", entradas);
        renderDiario();
      }
    });
  });
}

/* ---------- Notificaciones ---------- */
function notificar(mensaje) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification("Avanza conmigo", { body: mensaje });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") new Notification("Avanza conmigo", { body: mensaje });
    });
  }
}

/* ---------- Escapar HTML ---------- */
function escapar(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Inicialización ---------- */
function init() {
  renderHistorialAnimo();
  renderDiario();
  actualizarStreakInicio();
  actualizarDisplay();

  // Si ya hay un ánimo guardado, mostrar su plan (con el tiempo por defecto)
  const ultimo = Store.get("avanza:ultimoAnimo", null);
  if (ultimo) {
    aplicarPlan(ultimo.mood);
  } else {
    setModo("foco");
  }
}

init();
