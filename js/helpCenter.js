function renderFAQAccordion() {
  const el = document.getElementById('faqAccordion');
  el.innerHTML = FAQ_ITEMS.map((item, i) => `
    <div class="faq-item" id="faq-item-${i}">
      <div class="faq-q" onclick="toggleFAQ(${i})">
        ${item.q}
        <span class="faq-chevron">&#9662;</span>
      </div>
      <div class="faq-a"><div class="faq-a-inner">${item.a}</div></div>
    </div>`).join('');
}

function toggleFAQ(i) {
  document.getElementById('faq-item-' + i).classList.toggle('open');
}
