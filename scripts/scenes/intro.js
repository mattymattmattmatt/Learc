import { registerRoute }    from '../router.js';
import { loadSave, saveProgress } from '../save.js';
import { playBGM }          from '../bgm.js';

function fitCard() {
  const c = document.querySelector('.title-card');
  if (!c) return;
  const s = Math.min((innerWidth*0.95)/500,(innerHeight*0.95)/480,1);
  c.style.transform = `scale(${s})`;
  c.style.transformOrigin = 'center';
}

function render(container){
  playBGM('intro');
  container.innerHTML = `
    <div class="title-card">
      <img src="assets/img/king_intro.gif" alt="King"
           style="width:200px;margin:0 auto 0.6rem">
      <p id="text" class="body-text">
        “Greetings, traveller! I am the King of distant Liitokala.
        Will you help me in a matter of great urgency?”
      </p>
      <div class="btn-group" id="choice">
        <button class="big-btn" data-a="yes">Yes, I will help</button>
        <button class="big-btn" data-a="no">No, I’m sorry</button>
      </div>
    </div>`; fitCard();
  addEventListener('resize',fitCard);
  addEventListener('orientationchange',fitCard);

  container.querySelectorAll('[data-a]').forEach(b=>{
    b.onclick=()=>choice(b.dataset.a,container);});
}

function choice(ans,container){
  if(ans==='no'){location.hash='gameover';return;}
  const card=container.querySelector('.title-card');
  const text=container.querySelector('#text');
  card.querySelector('#choice').remove();
  const pages=[
    '“Thank you, noble friend! Your courage gives me hope.”',
    '“Last night our treasury was robbed—thirty chests of gold scattered across the world.”',
    '“Before you set out on this adventure… what shall I call you?”'
  ];
  let i=0;
  const next=document.createElement('button');
  next.className='big-btn';next.textContent='Next ➔';
  card.appendChild(next);
  next.onclick=()=>{
    i++; if(i<pages.length){text.textContent=pages[i];return;}
    next.remove(); askName(card);};
}

function askName(card){
  card.innerHTML+=`
    <input id="nameBox" type="text" maxlength="16"
           placeholder="Enter your explorer name">
    <button id="begin" class="big-btn">Begin the Adventure</button>`;
  fitCard();
  card.querySelector('#begin').onclick=async()=>{
    const name=card.querySelector('#nameBox').value.trim();if(!name)return;
    await loadSave(name); await saveProgress(name,{hero:null});
    card.innerHTML=`
      <img src="assets/img/king_intro.gif" alt="King"
           style="width:200px;margin:0 auto 0.6rem">
      <p class="body-text">“Wonderful, <b>${name}</b>! May fortune guide you.”</p>
      <button class="big-btn" id="toPuz">Next ➔</button>`;
    fitCard();
    card.querySelector('#toPuz').onclick=()=>{location.hash='AU-01';};
  };
}

registerRoute('intro',render);
export default render;
