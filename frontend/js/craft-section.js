// Section "Savoir-faire" de la page d'accueil : 4 photos animées au scroll
// (GSAP + ScrollTrigger, déjà chargés pour le hero).
//
// La section fait 400vh ; son contenu (.craft-sticky) reste collé à l'écran.
// La progression du scroll dans la section (0 -> 1) pilote une timeline :
// chaque photo occupe 25 % du scroll, avec un fondu enchaîné vers la suivante,
// un zoom lent (1.1 -> 1) et l'apparition de son texte.
//
// Sans animation (prefers-reduced-motion, ou GSAP indisponible), on n'ajoute
// pas la classe "craft--animated" : le CSS affiche alors les 4 photos les unes
// sous les autres, avec leur texte.

document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('savoir-faire');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // Active la mise en page "plein écran superposé" (voir .craft--animated dans style.css).
  section.classList.add('craft--animated');

  const slides = gsap.utils.toArray(section.querySelectorAll('.craft-slide'));
  const fill = section.querySelector('.craft-progress-fill');
  const label = section.querySelector('.craft-progress-current');
  const STEP = 1 / slides.length; // 0.25 : part du scroll de chaque photo
  const FADE = 0.06;              // durée d'un fondu enchaîné (6 % du scroll)

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      // Numéro de l'étape (01 à 04) d'après la position réelle du scroll.
      onUpdate: (self) => {
        const step = Math.min(slides.length, Math.floor(self.progress * slides.length) + 1);
        label.textContent = String(step).padStart(2, '0');
      },
    },
  });

  // Comme pour le hero, la timeline dure 1 : les positions sont des fractions du scroll.

  // Barre de progression : se remplit de 0 à 100 % sur toute la section.
  tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1, duration: 1 }, 0);

  slides.forEach((slide, i) => {
    const img = slide.querySelector('.craft-img');
    const text = slide.querySelector('.craft-text');
    const start = i * STEP;           // début de la plage de la photo
    const end = (i + 1) * STEP;       // fin de la plage
    const isFirst = i === 0;
    const isLast = i === slides.length - 1;

    // Zoom lent sur toute la durée où la photo est visible (fondus compris).
    const zoomFrom = isFirst ? 0 : start - FADE / 2;
    const zoomTo = isLast ? 1 : end + FADE / 2;
    tl.fromTo(img, { scale: 1.1 }, { scale: 1, duration: zoomTo - zoomFrom }, zoomFrom);

    // Fondu enchaîné, à cheval sur la limite entre deux plages : la photo
    // suivante (au-dessus dans le HTML) apparaît PAR-DESSUS la photo actuelle,
    // qui reste opaque. Si les deux s'estompaient en même temps, on verrait le
    // fond noir à travers au milieu de la transition.
    if (!isFirst) {
      tl.fromTo(slide, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE }, start - FADE / 2);
      // Texte : arrive juste après la photo, en fondu + léger glissement vers le haut.
      tl.fromTo(text, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: FADE }, start + 0.01);
    }
    if (!isLast) {
      // Le texte part un peu avant la photo, pour ne pas se superposer au suivant.
      tl.to(text, { autoAlpha: 0, y: -30, duration: FADE / 2 }, end - FADE);
      // Une fois recouverte par la suivante, la photo est masquée (son bouton
      // éventuel n'est plus cliquable). "set" est rejoué à l'envers si on remonte.
      tl.set(slide, { autoAlpha: 0 }, end + FADE / 2);
    }
  });
});
