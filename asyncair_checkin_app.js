(() => {
  const ROW_COUNT = 18;
  const SEAT_LETTERS = ["A", "B", "C", "D", "E", "F"];

  const initialSeatMap = () =>
    Array.from({ length: ROW_COUNT }, (_, index) => index + 1).flatMap((row) =>
      SEAT_LETTERS.map((letter) => ({
        row,
        letter,
        code: `${row}${letter}`,
        status:
          (row * 11 + letter.charCodeAt(0)) % 7 === 0 ||
          (row % 8 === 0 && ["C", "D"].includes(letter))
            ? "occupied"
            : "available",
      }))
    );

  const initialState = {
    loading: false,
    logs: [],
    result: null,
    currentRequestId: 0,
    phase: "idle",
    seatMap: initialSeatMap(),
  };

  const form = document.getElementById("checkin-form");
  const nameInput = document.getElementById("passenger-name");
  const idInput = document.getElementById("passenger-id");
  const button = document.getElementById("submit-btn");
  const statusList = document.getElementById("status-list");
  const resultRoot = document.getElementById("result-root");
  const seatMapRoot = document.getElementById("seat-map");
  const statusPill = document.getElementById("status-pill");

  const appendLog = (logs, message, type = "info") => [
    ...logs,
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      type,
    },
  ];

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const withLatency = (ms, effect) => delay(ms).then(effect);

  const chooseRandom = (items) => items[Math.floor(Math.random() * items.length)];

  const markSeatAssigned = (seatMap, assignedCode) =>
    seatMap.map((seat) =>
      seat.code === assignedCode ? { ...seat, status: "assigned" } : seat
    );

  const seatFor = (seatMap, row, letter) =>
    seatMap.find((seat) => seat.row === row && seat.letter === letter);

  const pillContent = (phase) =>
    phase === "running"
      ? { label: "Procesando check-in", className: "status-pill running" }
      : phase === "success"
        ? { label: "Check-in exitoso", className: "status-pill success" }
        : phase === "error"
          ? { label: "Proceso detenido por error", className: "status-pill error" }
          : { label: "Listo para iniciar", className: "status-pill idle" };

  const setStatusPill = (phase) => {
    const content = pillContent(phase);
    statusPill.textContent = content.label;
    statusPill.className = content.className;
  };

  const validarPasaporte = (id) =>
    withLatency(1500, () =>
      id % 2 === 0
        ? Promise.reject(new Error("El ID de pasaporte es inválido"))
        : Promise.resolve({ documento: "Pasaporte", id, valido: true })
    );

  const verificarRestriccionesVisa = (id) =>
    withLatency(2000, () =>
      Math.random() < 0.3
        ? Promise.reject(new Error("Visa no válida para el destino"))
        : Promise.resolve({ documento: "Visa", id, valido: true })
    );

  const asignarAsiento = (seatMap = initialSeatMap()) =>
    withLatency(1000, () => {
      const availableSeats = seatMap.filter((seat) => seat.status === "available");
      return availableSeats.length === 0
        ? Promise.reject(new Error("No quedan asientos disponibles"))
        : Promise.resolve(chooseRandom(availableSeats).code);
    });

  const generarPaseAbordar = (datos) =>
    withLatency(500, () =>
      Promise.resolve({
        pasajero: datos.nombre,
        id: datos.id,
        asiento: datos.asiento,
        pasaporte: datos.pasaporte,
        visa: datos.visa,
        emitidoEn: new Date().toLocaleTimeString("es-CL"),
      })
    );

  const withTimeout = (promise, ms, errorMessage) =>
    Promise.race([
      promise,
      delay(ms).then(() => Promise.reject(new Error(errorMessage))),
    ]);

  const renderLogs = (logs) => {
    statusList.innerHTML = logs
      .map(
        ({ message, type }) => `<li class="status-item ${type}">${message}</li>`
      )
      .join("");
  };

  const renderResult = (result) => {
    resultRoot.innerHTML = result
      ? `
        <article class="result-card">
          <h2 class="section-title">Pase de abordar generado</h2>
          <div class="result-grid">
            <div class="result-field">
              <span class="label">Pasajero</span>
              <span class="value">${result.pasajero}</span>
            </div>
            <div class="result-field">
              <span class="label">ID</span>
              <span class="value">${result.id}</span>
            </div>
            <div class="result-field">
              <span class="label">Asiento</span>
              <span class="value">${result.asiento}</span>
            </div>
            <div class="result-field">
              <span class="label">Hora de emisión</span>
              <span class="value">${result.emitidoEn}</span>
            </div>
          </div>
        </article>
      `
      : "";
  };

  const renderSeatRow = (seatMap, row) => {
    const groupHtml = (letters) =>
      letters
        .map((letter) => seatFor(seatMap, row, letter))
        .map(
          (seat) =>
            `<div class="seat ${seat.status}" title="${seat.code}">${seat.letter}</div>`
        )
        .join("");

    return `
      <div class="seat-row">
        <div class="row-number">${row}</div>
        <div class="seat-group">${groupHtml(["A", "B", "C"])}</div>
        <div class="aisle">|</div>
        <div class="seat-group">${groupHtml(["D", "E", "F"])}</div>
      </div>
    `;
  };

  const renderSeatMap = (seatMap) => {
    seatMapRoot.innerHTML = Array.from({ length: ROW_COUNT }, (_, index) => index + 1)
      .map((row) => renderSeatRow(seatMap, row))
      .join("");
  };

  const render = (state) => {
    button.disabled = state.loading;
    nameInput.disabled = state.loading;
    idInput.disabled = state.loading;
    renderLogs(state.logs);
    renderResult(state.result);
    renderSeatMap(state.seatMap);
    setStatusPill(state.phase);
  };

  // Store funcional: encapsula el único punto de estado mutable del módulo.
  // Desde afuera solo se ve `dispatch` (aplica un reducer puro) y `getState`.
  const createStore = (initial, onChange) => {
    const ref = { current: initial };
    const getState = () => ref.current;
    const dispatch = (reducer) => {
      ref.current = reducer(ref.current);
      onChange(ref.current);
      return ref.current;
    };
    onChange(ref.current);
    return { getState, dispatch };
  };

  const store = createStore(initialState, render);

  const addStateLog = (message, type = "info") => (current) => ({
    ...current,
    logs: appendLog(current.logs, message, type),
  });

  const safeUpdate = (requestId, reducer) => {
    const current = store.getState();
    if (requestId === current.currentRequestId && current.phase === "running") {
      store.dispatch(reducer);
    }
  };

  const runValidaciones = (pasajeroId, requestId) => {
    safeUpdate(requestId, addStateLog("Iniciando validaciones...", "info"));

    const passportPromise = validarPasaporte(pasajeroId).then((resultado) => {
      safeUpdate(requestId, addStateLog("Pasaporte verificado", "success"));
      return resultado;
    });

    const visaPromise = verificarRestriccionesVisa(pasajeroId).then((resultado) => {
      safeUpdate(requestId, addStateLog("Visa verificada", "success"));
      return resultado;
    });

    return Promise.all([passportPromise, visaPromise]);
  };

  const iniciarCheckIn = ({ pasajeroId, nombre, requestId, seatMap }) => {
    const proceso = runValidaciones(pasajeroId, requestId)
      .then(([pasaporte, visa]) => {
        safeUpdate(requestId, addStateLog("Asignando asiento...", "info"));
        return asignarAsiento(seatMap).then((asiento) => ({
          id: pasajeroId,
          nombre,
          pasaporte,
          visa,
          asiento,
        }));
      })
      .then((datos) => {
        safeUpdate(requestId, (current) => ({
          ...current,
          seatMap: markSeatAssigned(current.seatMap, datos.asiento),
          logs: appendLog(
            current.logs,
            `Asiento asignado: ${datos.asiento}`,
            "success"
          ),
        }));
        safeUpdate(requestId, addStateLog("Generando pase de abordar...", "info"));
        return generarPaseAbordar(datos);
      });

    return withTimeout(proceso, 4000, "Tiempo de espera agotado")
      .then((resultadoFinal) => {
        safeUpdate(requestId, (current) => ({
          ...current,
          loading: false,
          phase: "success",
          result: resultadoFinal,
          logs: appendLog(
            current.logs,
            "Check-in completado con éxito",
            "success"
          ),
        }));
        return resultadoFinal;
      })
      .catch((error) => {
        safeUpdate(requestId, (current) => ({
          ...current,
          loading: false,
          phase: "error",
          result: null,
          logs: appendLog(current.logs, `Error: ${error.message}`, "error"),
        }));
        return Promise.reject(error);
      });
  };

  const resetForNewRequest = (requestId, freshSeatMap, passengerId, nombre) => (current) => ({
    ...current,
    loading: true,
    phase: "running",
    result: null,
    seatMap: freshSeatMap,
    currentRequestId: requestId,
    logs: appendLog(
      [],
      `Nuevo check-in para ${nombre} (ID ${passengerId})`,
      "warning"
    ),
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const passengerId = Number(idInput.value);
    const nombre = nameInput.value.trim();

    if (nombre.length === 0) {
      store.dispatch((current) => ({
        ...current,
        phase: "error",
        result: null,
        logs: appendLog(current.logs, "Error: Ingresa el nombre del pasajero", "error"),
      }));
      return;
    }

    if (!Number.isInteger(passengerId) || passengerId <= 0) {
      store.dispatch((current) => ({
        ...current,
        phase: "error",
        result: null,
        logs: appendLog(current.logs, "Error: Ingresa un ID numérico válido", "error"),
      }));
      return;
    }

    const requestId = store.getState().currentRequestId + 1;
    const freshSeatMap = initialSeatMap();
    store.dispatch(resetForNewRequest(requestId, freshSeatMap, passengerId, nombre));
    iniciarCheckIn({ pasajeroId: passengerId, nombre, requestId, seatMap: freshSeatMap }).catch(
      () => null
    );
  });
})();
