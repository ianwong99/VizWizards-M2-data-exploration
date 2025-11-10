// Advanced scroll handling for smooth transitions and interactions

let currentSection = 0;
const sections = [];
let isScrolling = false;

document.addEventListener('DOMContentLoaded', function() {
    initSections();
    initScrollTracking();
    initKeyboardNavigation();
});

// Initialize sections array
function initSections() {
    const sectionElements = document.querySelectorAll('.story-section');
    sectionElements.forEach((section, index) => {
        sections.push({
            element: section,
            index: index,
            top: section.offsetTop,
            height: section.offsetHeight
        });
    });
}

// Track scroll position and update active section
function initScrollTracking() {
    let ticking = false;

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                updateActiveSection();
                ticking = false;
            });
            ticking = true;
        }
    });
}

// Update which section is currently active based on scroll position
function updateActiveSection() {
    const scrollPosition = window.scrollY + (window.innerHeight / 2);
    
    sections.forEach((section, index) => {
        const sectionTop = section.element.offsetTop;
        const sectionBottom = sectionTop + section.element.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            if (currentSection !== index) {
                currentSection = index;
                onSectionChange(index);
            }
        }
    });
}

// Handle section change events
function onSectionChange(index) {
    console.log(`Active section: ${index}`);
    
    // Update any section-specific UI or interactions
    updateNavigation(index);
    
    // Optional: Trigger any section-specific animations or data loads
    triggerSectionAnimation(index);
}

// Update navigation state
function updateNavigation(index) {
    // You can add navigation dots or indicators here
    const totalSections = sections.length;
    const progress = ((index + 1) / totalSections) * 100;
    
    // Update any navigation UI elements
    document.body.setAttribute('data-current-section', index);
}

// Trigger animations when entering a section
function triggerSectionAnimation(index) {
    const section = sections[index];
    if (section) {
        section.element.classList.add('active');
        
        // Remove active class from other sections
        sections.forEach((s, i) => {
            if (i !== index) {
                s.element.classList.remove('active');
            }
        });
    }
}

// Keyboard navigation (arrow keys)
function initKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        if (isScrolling) return;
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            scrollToNextSection();
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            scrollToPreviousSection();
        } else if (e.key === 'Home') {
            e.preventDefault();
            scrollToSection(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            scrollToSection(sections.length - 1);
        }
    });
}

// Scroll to next section
function scrollToNextSection() {
    if (currentSection < sections.length - 1) {
        scrollToSection(currentSection + 1);
    }
}

// Scroll to previous section
function scrollToPreviousSection() {
    if (currentSection > 0) {
        scrollToSection(currentSection - 1);
    }
}

// Scroll to specific section with smooth animation
function scrollToSection(index) {
    if (index >= 0 && index < sections.length) {
        isScrolling = true;
        
        sections[index].element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Reset scrolling flag after animation
        setTimeout(() => {
            isScrolling = false;
            currentSection = index;
        }, 1000);
    }
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle window resize
window.addEventListener('resize', debounce(function() {
    // Recalculate section positions on resize
    initSections();
}, 250));

// Export functions for external use
window.scrollToSection = scrollToSection;
window.scrollToNextSection = scrollToNextSection;
window.scrollToPreviousSection = scrollToPreviousSection;