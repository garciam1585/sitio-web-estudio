const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../script.js', 'utf8');
function setup(mobile = false) {
    const listeners = {}, formListeners = {}, timers = new Map(), redirects = [];
    let timerId = 0;
    const elements = {
        name: {value:'Prueba'}, email: {value:'prueba@example.invalid'}, phone: {value:''},
        service: {value:'Gestión de Jubilaciones'}, message: {value:'Prueba local'},
        'form-message': {style:{}},
        'contact-form': {addEventListener:(type, fn)=>formListeners[type]=fn, reset(){}}
    };
    const location = {pathname:'/gestion-jubilaciones'};
    Object.defineProperty(location,'href',{set:value=>redirects.push(value)});
    const context = {
        document: {
            getElementById:id=>elements[id] || null,
            querySelectorAll:()=>[],
            addEventListener:(type,fn,capture)=>listeners[type]={fn,capture}
        },
        window: {location, dataLayer:[], addEventListener(){}},
        navigator:{userAgent: mobile ? 'Android' : 'Desktop'},
        IntersectionObserver:class {observe(){}},
        setTimeout:(fn, delay)=>{timers.set(++timerId,{fn,delay});return timerId},
        clearTimeout:id=>timers.delete(id), console
    };
    vm.createContext(context); vm.runInContext(source,context);
    return {context,listeners,formListeners,timers,redirects,elements};
}
function link(href,location) {
    return {
        getAttribute:()=>href,
        classList:{contains:name=>name==='whatsapp-button' && location==='floating'},
        closest:selector=>selector==='a[href]' ? link(href,location) :
            ({sidebar:'.sidebar',bottom:'.cta-section',footer:'.footer',contact_section:'#contacto'}[location]===selector ? {} : null)
    };
}
for (const place of ['floating','sidebar','bottom','footer','contact_section']) {
    const env=setup(); env.listeners.click.fn({target:link('https://wa.me/541130082030',place)});
    assert.equal(env.listeners.click.capture,true);
    assert.equal(env.context.window.dataLayer.length,1);
    assert.equal(env.context.window.dataLayer[0].cta_location,place);
    assert.equal(env.context.window.dataLayer[0].event,undefined,'Metadata must not create a second event');
}
for (const href of ['tel:+541130082030','mailto:contacto@mgabogado.com.ar']) {
    const env=setup(); env.listeners.click.fn({target:link(href,'contact_section')});
    assert.equal(env.context.window.dataLayer.length,1);
}
{
    const env=setup(); env.listeners.click.fn({target:link('https://www.example.com','other')});
    assert.equal(env.context.window.dataLayer.length,0);
    env.elements.email.value='invalid'; env.formListeners.submit({preventDefault(){}});
    assert.equal(env.context.window.dataLayer.length,0);
    assert.equal(env.redirects.length,0);
}
for (const mobile of [false,true]) {
    const env=setup(mobile); const submit=()=>env.formListeners.submit({preventDefault(){}});
    submit();submit();
    assert.equal(env.context.window.dataLayer.length,1,'Repeated submit must not duplicate');
    const event=env.context.window.dataLayer[0];
    assert.equal(event.event,'contact_whatsapp');
    assert.equal(event.contact_origin,'validated_form');
    assert.equal(event.service,'gestion-jubilaciones');
    assert.equal(event.form_id,'contact-form');
    assert.equal(JSON.stringify(event).includes('prueba@example.invalid'),false);
    assert.equal(env.redirects.length,0);
    const fallback=[...env.timers.values()].find(t=>t.delay===1200).fn;
    event.eventCallback();fallback();event.eventCallback();
    assert.equal(env.redirects.length,1,'Callback and timeout must navigate only once');
    assert.ok(env.redirects[0].startsWith(mobile?'whatsapp://send':'https://api.whatsapp.com/send'));
}
{
    const env=setup(); env.formListeners.submit({preventDefault(){}});
    [...env.timers.values()].find(t=>t.delay===1200).fn();
    assert.equal(env.redirects.length,1,'Blocked GTM must not prevent handoff');
}
console.log('PASS: location, channels, validation, duplicate submit, callback, fallback, mobile/desktop, no personal analytics parameters');


