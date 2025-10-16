/* global onLayout, onResize, onFullscreenChange */

// Code common to all pages

function initialize() {
    readyDocument();

    // Enable disabled controls that can't function until this script is loaded

    enableNavigation();

    // Set initial focus

    focusDocument();
}

function readyDocument() {
    document.body.classList.add('ready');
}

function enableNavigation() {
    let el = document.querySelector('header nav');

    // If page has tabstrip...

    if (el) {
        enableTabstrip(el);
    } else {
        console.warn('Tabstrip navigation not found!');
    }

    el = document.querySelector('.buttons');

    // If page has buttons...

    if (el) {
        const els = el.getElementsByTagName('button');

        Array.from(els).forEach(el => {
            el.disabled = false;
        });
    } else {
        console.warn('Navigation buttons not found!');
    }
}

function focusDocument() {
    const el = document.querySelector('[data-autofocus]');

    // If page has auto-focusable element...

    if (el) {
        if (el.disabled) {
            console.warn('Auto-focus element is disabled!');
        }

        if (!el.offsetHeight) {
            console.warn('Auto-focus element is not displayed!');
        }

        if (!el.focus) {
            console.warn('Auto-focus element is not focusable!');
        }

        el.focus();
    }
}

// Tabstrip

function onTabstripKeyDown({ target, keyCode }) {
    const elTabs = target.parentNode.getElementsByTagName('section');
    const currentTabIndex = Array.from(elTabs).findIndex(el => el === target);

    if (keyCode === 37) {
        // Left arrow key

        if (currentTabIndex) {
            switchTab(elTabs[currentTabIndex - 1]);
        }
    } else if (keyCode === 39) {
        // Right arrow key

        if (currentTabIndex != elTabs.length - 1) {
            switchTab(elTabs[currentTabIndex + 1]);
        }
    }

    // TODO: Home and End keys
}

function onTabClick({ currentTarget }) {
    switchTab(currentTarget);
}

function switchTab(el) {
    const controls = el.getAttribute('aria-controls');
    const elParent = el.parentNode;
    const elPane = document.getElementById(controls);
    const elPaneParent = elPane.parentNode;

    // Show the currently controled pane and hide others.

    Array.from(elPaneParent.getElementsByTagName('section')).forEach(el => {
        // TODO: Should use a boolean hidden property for same effect.

        if (el.id == controls) {
            el.removeAttribute('hidden');
        } else {
            el.setAttribute('hidden', 'hidden');
        }
    });

    // Set aria-selected for current tab and reset for others.

    Array.from(elParent.getElementsByTagName('button')).forEach(elSibling => {
        const selected = elSibling === el;

        elSibling.setAttribute('aria-selected', String(selected));
        elSibling.setAttribute('tabindex', selected ? 0 : -1);
    });

    // TODO: fireOnLayout(id)

    if (typeof onLayout == 'function') {
        // Pass the section ID

        onLayout(controls);
    }
}

function enableTabstrip(el) {
    const buttons = Array.from(el.getElementsByTagName('button'));

    buttons.forEach(el => el.disabled = false);

    // TODO: Split up

    // Get the selected tab button

    const selectedTab = buttons.find(el => el.getAttribute('aria-selected') == 'true');

    if (typeof onLayout == 'function') {
        // Pass the section ID

        onLayout(selectedTab.getAttribute('aria-controls'));
    }
}

const pixelcadeAddress = ''; // TODO: template from pixelcade.json
// const pixelcadeAddress = 'localhost'; // TODO: template from pixelcade.json

const pixelcadePort = '8080';
// const pixelcadePort = '8081'; // configurable in pixelweb?

function setPixelcadeGameMarquee(system, game) {
    const elImage = new Image();

    elImage.src = `http://${ pixelcadeAddress }:${ pixelcadePort }/arcade/stream/${ encodeURIComponent(system) }/${ encodeURIComponent(game) }`;
}

function setPixelcadeSystemMarquee(system) {
    const elImage = new Image();

    elImage.src = `http://${ pixelcadeAddress }:${ pixelcadePort }/console/stream/${ encodeURIComponent(system) }/`;
}

function getCanvas() {
    return document.getElementById('canvas');
}

function scaleCanvas() {

}

function scaleBezel() {
    const elBezel = document.querySelector('[data-id="bezel"]');
    const elShaders = document.querySelector('[data-id="shaders"]');
    const elCanvas = getCanvas();

    // Allow bezel to be optional and don't bother if canvas is not displayed

    if (elCanvas.offsetHeight) {
        if (elBezel) {
            elBezel.style.width = `${ elCanvas.offsetWidth }px`;
        }

        if (elShaders) {
            elShaders.style.width = `${ elCanvas.offsetWidth }px`;
        }
    }
}

function isFullscreen() {
    return !!document.fullscreenElement;
}

function toggleFullscreen() {
    if (isFullscreen()) {
        document.body.classList.remove('full-screen');

        document.exitFullscreen();
    } else {
        document.body.classList.add('full-screen');

        document.documentElement.requestFullscreen().catch(err => {
            // Log the known error but proceed, as the user understands this might be blocked.
            console.error(err);
        });
    }
}

window.onresize = () => {
    if (typeof onResize == 'function') {
        onResize();
    }
};

document.addEventListener('fullscreenchange', () => {
    if (typeof onFullscreenChange == 'function') {
        onFullscreenChange();
    }
});