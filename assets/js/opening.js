const opening = new SimpleOpeningHours(window.openingHours.textContent);
// Translate
window.openingHours.textContent = window.openingHours.textContent.replace('Mo', window.LANG.weekdays.Mo)
                                                .replace('Tu', window.LANG.weekdays.Tu)
                                                .replace('We', window.LANG.weekdays.We)
                                                .replace('Th', window.LANG.weekdays.Th)
                                                .replace('Fr', window.LANG.weekdays.Fr)
                                                .replace('Sa', window.LANG.weekdays.Sa)
                                                .replace('Su', window.LANG.weekdays.Su)
                                                .replace('PH', window.LANG.weekdays.PH)
                                                .replace('off', window.LANG.weekdays.off);
if (opening.isOpen()) {
    // Append banner
    const openSamp = document.createElement('samp');
    openSamp.textContent = window.LANG.nowOpen;
    window.openingHours.appendChild(openSamp);
}
// Cleanup
window.openingHours = null;
