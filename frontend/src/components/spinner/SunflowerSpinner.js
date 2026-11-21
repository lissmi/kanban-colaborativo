import React from 'react';
import './SunflowerSpinner.css';

/**
 * Spinner global reutilizable: no necesita imágenes, SVG ni librerías externas.
 * La flor está hecha con elementos React y animaciones CSS encapsuladas.
 * Se muestra solo mientras una carga inicial realmente está pendiente.
 */
export default function SunflowerSpinner({ message = 'Cargando tu espacio...' }) {
  return (
    <div className="kb-spinner-overlay" role="status" aria-live="polite" aria-busy="true">
      {/* Todo el dibujo es decorativo; el mensaje informa a lectores de pantalla. */}
      <div className="kb-sunflower" aria-hidden="true">
        {/* Ojos y sonrisa se mueven con el centro de la flor. */}
        <div className="kb-sunflower__head">
          <span className="kb-sunflower__eye kb-sunflower__eye--left" />
          <span className="kb-sunflower__eye kb-sunflower__eye--right" />
          <span className="kb-sunflower__mouth" />
        </div>
        {/* Pétalos giratorios y núcleo anaranjado. */}
        <div className="kb-sunflower__petals" />
        {/* Tallo y hojas acompañan el movimiento de la flor. */}
        <div className="kb-sunflower__trunk">
          <span className="kb-sunflower__branch kb-sunflower__branch--left" />
          <span className="kb-sunflower__branch kb-sunflower__branch--right" />
        </div>
        {/* Macetero formado solo con bordes CSS. */}
        <div className="kb-sunflower__vase" />
      </div>
      <p className="kb-spinner-message">{message}</p>
    </div>
  );
}
