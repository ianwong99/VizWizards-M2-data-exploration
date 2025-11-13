// Main app initialization
document.addEventListener('DOMContentLoaded', function() {
    initHeroFade();
    initScrollAnimations();
    initProgressBar();
    initVizListeners();
});

// Hero image fade effect as you scroll
function initHeroFade() {
    const hero = document.getElementById('hero-section');
    const heroBackground = hero.querySelector('.hero-background');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.scrollY;
        const heroHeight = hero.offsetHeight;
        
        // Calculate fade based on scroll position
        let opacity = 1 - (scrollTop / (heroHeight * 0.8));
        opacity = Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
        
        heroBackground.style.opacity = opacity;
    });
}

// Initialize scroll-triggered animations for sections
function initScrollAnimations() {
    const sections = document.querySelectorAll('.story-section');
    
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

// Progress bar that fills as user scrolls
function initProgressBar() {
    const progressFill = document.getElementById('progress-fill');
    
    window.addEventListener('scroll', function() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const scrolled = window.scrollY;
        const progress = (scrolled / documentHeight) * 100;
        
        progressFill.style.width = progress + '%';
    });
}

// Initialize Tableau visualization listeners
function initVizListeners() {
    const vizElements = document.querySelectorAll('tableau-viz');
    
    vizElements.forEach((viz, index) => {
        viz.addEventListener('firstinteractive', function(e) {
            console.log(`Visualization ${index} is ready`);
        });

        // Optional: Add error handling
        viz.addEventListener('error', function(e) {
            console.error(`Error loading visualization ${index}:`, e);
        });
    });
}

// Export functionality for visualizations
function exportViz(vizId, format = 'pdf') {
    const viz = document.getElementById(vizId);
    
    if (viz && viz.workbook) {
        viz.workbook.exportPDFAsync().then(function(result) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(result);
            link.download = `tableau-export-${vizId}.${format}`;
            link.click();
        }).catch(function(error) {
            console.error('Export failed:', error);
        });
    }
}

// Smooth scroll to specific section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Make functions available globally if needed
window.exportViz = exportViz;
window.scrollToSection = scrollToSection;