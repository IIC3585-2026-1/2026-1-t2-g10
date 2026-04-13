(() => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const animateNumber = async (element, target) => {
    const duration = 2000; // 2 segundos
    const start = 0;
    const increment = target / (duration / 50);
    let current = start;

    while (current < target) {
      current += increment;
      element.textContent = 
        target % 1 === 0 
          ? Math.floor(current).toLocaleString('es-CL')
          : Math.min(current, target).toFixed(1);
      await delay(50);
    }

    element.textContent = 
      target % 1 === 0 
        ? target.toLocaleString('es-CL')
        : target.toFixed(1);
  };

  const animateStats = async () => {
    // Simular que estamos "procesando" en paralelo
    const stats = document.querySelectorAll('.stat-number');
    const targets = [2847, 98, 3.2];

    // Promise.all para mostrar que corren en paralelo (como en el check-in)
    await Promise.all(
      [...stats].map((stat, index) => 
        animateNumber(stat, targets[index])
      )
    );
  };

  // Trigger la animación cuando la página esté lista
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', animateStats);
  } else {
    // Si el documento ya está cargado
    animateStats();
  }

  // Efecto interactivo: muestra un "boarding" simulado al hacer hover en el botón
  const ctaButton = document.querySelector('.cta-button');
  
  if (ctaButton) {
    ctaButton.addEventListener('mouseenter', async () => {
      const originalText = ctaButton.querySelector('.button-text').textContent;
      const messages = [
        'Validando...',
        'Asignando asiento...',
        'Generando pase...',
        'Listo!'
      ];

      const buttonText = ctaButton.querySelector('.button-text');
      
      for (const message of messages) {
        buttonText.textContent = message;
        await delay(400);
      }
    });
  }
})();
