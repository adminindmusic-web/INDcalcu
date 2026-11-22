const expressionDisplay = document.getElementById('expression');
const resultDisplay = document.getElementById('result');
const angleToggle = document.getElementById('angleToggle');
const angleModeLabel = document.getElementById('angleMode');
const memoryIndicator = document.getElementById('memoryIndicator');
const logoMark = document.querySelector('.brand-mark');
const logoPupils = document.querySelectorAll('.logo-pupil');
const lampIntro = document.getElementById('lampIntro');
const lampPull = document.getElementById('lampPull');
const lampLoading = document.getElementById('lampLoading');
const pageShell = document.querySelector('.page-shell');

let expression = '';
let angleMode = 'DEG';
let justEvaluated = false;
let memoryValue = null;
let lastAnswer = 0;

function formatResult(value) {
  if (!Number.isFinite(value)) throw new Error('Hasil tidak valid');
  if (Object.is(value, -0)) value = 0;
  const rounded = Number(value.toPrecision(11));
  return String(rounded);
}

function calculate(source) {
  const tokens = source.match(/(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?|(?:[a-zA-Z]+)|[()+\-*/^%!,]/g) || [];
  if (tokens.join('') !== source.replace(/\s+/g, '')) throw new Error('Ekspresi tidak valid');
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function parseExpression() {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (peek() === '*' || peek() === '/') {
      const operator = take();
      const right = parseUnary();
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  function parseUnary() {
    if (peek() === '+') { take(); return parseUnary(); }
    if (peek() === '-') { take(); return -parseUnary(); }
    return parsePower();
  }

  function parsePower() {
    let value = parsePostfix();
    if (peek() === '^') {
      take();
      value = Math.pow(value, parseUnary());
    }
    return value;
  }

  function parsePostfix() {
    let value = parsePrimary();
    while (peek() === '!' || peek() === '%') {
      const operator = take();
      if (operator === '%') value /= 100;
      else {
        if (value < 0 || !Number.isInteger(value) || value > 170) throw new Error('Faktorial hanya untuk bilangan bulat 0–170');
        let factorial = 1;
        for (let n = 2; n <= value; n++) factorial *= n;
        value = factorial;
      }
    }
    return value;
  }

  function parsePrimary() {
    const token = take();
    if (token === undefined) throw new Error('Ekspresi belum lengkap');
    if (token === '(') {
      const value = parseExpression();
      if (take() !== ')') throw new Error('Kurung belum lengkap');
      return value;
    }
    if (/^(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?$/.test(token)) return Number(token);
    if (/^[a-zA-Z]+$/.test(token)) {
      if (token === 'pi') return Math.PI;
      if (token === 'e') return Math.E;
      if (take() !== '(') throw new Error('Fungsi perlu tanda kurung');
      const first = parseExpression();
      let second;
      if (peek() === ',') {
        take();
        second = parseExpression();
      }
      if (take() !== ')') throw new Error('Kurung belum lengkap');
      const angle = angleMode === 'DEG' ? first * Math.PI / 180 : first;
      const inverseAngle = (value) => angleMode === 'DEG' ? value * 180 / Math.PI : value;
      switch (token) {
        case 'sqrt': return Math.sqrt(first);
        case 'sin': return Math.sin(angle);
        case 'cos': return Math.cos(angle);
        case 'tan': return Math.tan(angle);
        case 'asin': return inverseAngle(Math.asin(first));
        case 'acos': return inverseAngle(Math.acos(first));
        case 'atan': return inverseAngle(Math.atan(first));
        case 'ln': return Math.log(first);
        case 'log': return Math.log10(first);
        case 'abs': return Math.abs(first);
        case 'dms': {
          const sign = Math.sign(first) || 1;
          const absolute = Math.abs(first);
          const degrees = Math.floor(absolute);
          const minutes = Math.floor((absolute - degrees) * 60);
          const seconds = ((absolute - degrees) * 60 - minutes) * 60;
          return sign * (degrees + minutes / 100 + seconds / 10000);
        }
        case 'frac':
          if (second === undefined) throw new Error('Pecahan perlu pembilang dan penyebut');
          return first / second;
        case 'hyp':
          if (second === undefined) throw new Error('hyp perlu dua nilai');
          return Math.hypot(first, second);
        case 'Pol':
          if (second === undefined) throw new Error('Pol perlu jarak dan sudut');
          return first * Math.cos(angleMode === 'DEG' ? second * Math.PI / 180 : second);
        case 'nCr': {
          if (second === undefined || !Number.isInteger(first) || !Number.isInteger(second) || first < 0 || second < 0 || second > first) throw new Error('nCr memerlukan bilangan bulat n ≥ r ≥ 0');
          let combination = 1;
          for (let index = 1; index <= Math.min(second, first - second); index++) combination = combination * (first - index + 1) / index;
          return combination;
        }
        default: throw new Error('Fungsi tidak dikenal');
      }
    }
    throw new Error('Ekspresi tidak valid');
  }

  const value = parseExpression();
  if (position !== tokens.length) throw new Error('Ekspresi tidak valid');
  return value;
}

function refresh() {
  expressionDisplay.textContent = expression || '0';
  memoryIndicator.style.visibility = memoryValue === null ? 'hidden' : 'visible';
  if (!expression) {
    resultDisplay.textContent = '0';
    return;
  }
  try {
    resultDisplay.textContent = formatResult(calculate(expression));
  } catch (error) {
    resultDisplay.textContent = error.message.includes('belum') ? '…' : '—';
  }
}

function insert(value) {
  if (justEvaluated && /[0-9.(a-zA-Z]/.test(value[0])) expression = '';
  justEvaluated = false;
  const operators = '+-*/^';
  if (operators.includes(value) && operators.includes(expression.slice(-1))) {
    expression = expression.slice(0, -1) + value;
  } else {
    expression += value;
  }
  refresh();
}

function evaluate() {
  if (!expression) return;
  try {
    const numericAnswer = calculate(expression);
    const answer = formatResult(numericAnswer);
    expression = answer;
    lastAnswer = numericAnswer;
    resultDisplay.textContent = answer;
    justEvaluated = true;
  } catch (error) {
    resultDisplay.textContent = error.message;
  }
  expressionDisplay.textContent = expression;
}

function handleAction(action) {
  if (action === 'clear') {
    expression = '';
    justEvaluated = false;
    refresh();
  } else if (action === 'delete') {
    if (justEvaluated) justEvaluated = false;
    expression = expression.slice(0, -1);
    refresh();
  } else if (action === 'equals') {
    evaluate();
  } else if (action === 'answer') {
    insert(String(lastAnswer));
  } else if (action === 'recall') {
    if (memoryValue !== null) insert(String(memoryValue));
  } else if (action === 'memory-add') {
    if (!expression) return;
    try {
      memoryValue = (memoryValue || 0) + calculate(expression);
      refresh();
    } catch (error) {
      resultDisplay.textContent = error.message;
    }
  } else if (action === 'eng') {
    if (!expression) return;
    try {
      const value = calculate(expression);
      expression = value.toExponential(6).replace(/\.?(\d*?)0+e/, (_, digits) => `${digits ? `.${digits}` : ''}e`);
      justEvaluated = false;
      refresh();
    } catch (error) {
      resultDisplay.textContent = error.message;
    }
  }
}

document.querySelectorAll('[data-insert]').forEach((button) => {
  button.addEventListener('click', () => insert(button.dataset.insert));
});
document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => handleAction(button.dataset.action));
});

lampPull.addEventListener('click', () => {
  if (lampIntro.classList.contains('is-on')) return;
  lampPull.disabled = true;
  lampIntro.classList.add('is-on');
  lampLoading.setAttribute('aria-hidden', 'false');

  window.setTimeout(() => {
    lampIntro.classList.add('is-leaving');
    document.body.classList.remove('intro-active');
    pageShell.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => lampIntro.remove(), 850);
  }, 2000);
});

angleToggle.addEventListener('click', () => {
  angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
  angleModeLabel.textContent = angleMode;
  refresh();
});

document.addEventListener('keydown', (event) => {
  if (/^[0-9.+\-*/^()%!]$/.test(event.key)) insert(event.key);
  else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); evaluate(); }
  else if (event.key === 'Backspace') handleAction('delete');
  else if (event.key === 'Escape') handleAction('clear');
});

let pupilX = 0;
let pupilY = 0;
let targetPupilX = 0;
let targetPupilY = 0;
let pupilFrame = null;

function animatePupils() {
  pupilX += (targetPupilX - pupilX) * 0.16;
  pupilY += (targetPupilY - pupilY) * 0.16;
  logoPupils.forEach((pupil) => {
    pupil.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
  });

  if (Math.abs(targetPupilX - pupilX) > 0.02 || Math.abs(targetPupilY - pupilY) > 0.02) {
    pupilFrame = requestAnimationFrame(animatePupils);
  } else {
    pupilX = targetPupilX;
    pupilY = targetPupilY;
    pupilFrame = null;
  }
}

function movePupilsToward(pointerX, pointerY) {
  const bounds = logoMark.getBoundingClientRect();
  const dx = pointerX - (bounds.left + bounds.width / 2);
  const dy = pointerY - (bounds.top + bounds.height / 2);
  const distance = Math.hypot(dx, dy) || 1;
  const movement = Math.min(2.2, distance * 0.025);
  targetPupilX = (dx / distance) * movement;
  targetPupilY = (dy / distance) * movement;

  if (pupilFrame === null) pupilFrame = requestAnimationFrame(animatePupils);
}

window.addEventListener('pointermove', (event) => movePupilsToward(event.clientX, event.clientY));
window.addEventListener('pointerleave', () => movePupilsToward(
  logoMark.getBoundingClientRect().left + logoMark.getBoundingClientRect().width / 2,
  logoMark.getBoundingClientRect().top + logoMark.getBoundingClientRect().height / 2
));

refresh();