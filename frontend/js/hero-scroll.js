// Hero de la page d'accueil : vidéo pilotée par le scroll (GSAP + ScrollTrigger).
//
// La section #hero fait 400vh de haut ; son contenu (.hero-sticky) reste collé
// à l'écran pendant qu'on la parcourt. ScrollTrigger mesure la progression du
// scroll dans la section (0 -> 1) et pilote une timeline GSAP qui :
//   - place la vidéo : currentTime = progression × durée,
//   - fait apparaître / disparaître les 3 textes au bon moment.
// La vidéo ne se lance jamais seule : descendre l'avance, remonter la rembobine.

document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('hero');
  if (!section) return;
  const video = section.querySelector('.hero-video');

  // Moins d'animations demandé : pas de scrub. Le CSS affiche alors le poster
  // et le titre (voir @media (prefers-reduced-motion) dans style.css).
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // CDN de GSAP injoignable : la page reste utilisable (poster + titre).
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // iOS Safari n'affiche les images d'une vidéo qu'après un premier play().
  // On le fait au premier toucher de l'écran, puis on remet en pause aussitôt.
  document.addEventListener(
    'touchstart',
    () => video.play().then(() => video.pause()).catch(() => {}),
    { once: true, passive: true }
  );

  function createAnimation() {
    const intro = section.querySelector('[data-step="intro"]');
    const reveal = section.querySelector('[data-step="reveal"]');
    const outro = section.querySelector('[data-step="outro"]');

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',      // début : le haut de la section touche le haut de l'écran
        end: 'bottom bottom',  // fin : le bas de la section touche le bas de l'écran
        scrub: 0.5,            // la timeline "rattrape" le scroll en 0,5 s : mouvement fluide
      },
    });

    // La timeline dure 1 : chaque position (dernier argument) est donc
    // directement une fraction de la progression (0.25 = 25 % du scroll).

    // Vidéo : de 0 à sa durée totale sur toute la section.
    tl.to(video, { currentTime: video.duration, duration: 1 }, 0);

    // Fondus : la section entière (texte + dégradé) en opacité, et le texte
    // seul glisse légèrement (translateY). autoAlpha = opacity + visibility,
    // donc un texte invisible n'est plus cliquable.
    const FADE = 0.05; // un fondu dure 5 % du scroll
    const fadeIn = (step, at) => {
      tl.fromTo(step, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE }, at);
      tl.fromTo(step.querySelector('.hero-step-content'), { y: 24 }, { y: 0, duration: FADE }, at);
    };
    const fadeOut = (step, at) => {
      tl.to(step, { autoAlpha: 0, duration: FADE }, at);
      tl.to(step.querySelector('.hero-step-content'), { y: -24, duration: FADE }, at);
    };

    fadeOut(intro, 0.25);  // étape 1 : visible de 0 à 25 %
    fadeIn(reveal, 0.30);  // étape 2 : visible de 35 à 60 %
    fadeOut(reveal, 0.60);
    fadeIn(outro, 0.65);   // étape 3 : visible de 70 à 100 %
  }

  // La durée de la vidéo n'est connue qu'une fois ses métadonnées chargées.
  // readyState >= 1 : elles l'étaient déjà avant que ce script s'exécute.
  if (video.readyState >= 1) createAnimation();
  else video.addEventListener('loadedmetadata', createAnimation, { once: true });
});
