const menu = document.querySelector('#mobile-menu')
const menuLinks = document.querySelector('.navbar__menu')
const navLogo = document.querySelector('#navbar__logo')

// display mobile menu
const mobileMenu = () => {
    menu.classList.toggle('is-active')
    menuLinks.classList.toggle('active')
}

menu.addEventListener('click', mobileMenu);

//show active menu when scrolling
const highlightMenu = () => {
	const elem = document.querySelector('.highlight');
	const homeMenu = document.querySelector('#home-page');
	const aboutMenu = document.querySelector('#about-page');
	const skillsMenu = document.querySelector('#skills-page');
	const experienceMenu = document.querySelector('#experiences-page');
	const catMenu = document.querySelector('#cat-page');

	let scrollPos = window.scrollY;	
  	// console.log(scrollPos);

  	// adds 'highlight' class to my menu items
	if (window.innerWidth > 960 && scrollPos < 600) {
		homeMenu.classList.add('highlight');
		aboutMenu.classList.remove('highlight');
		return;
	} else if (window.innerWidth > 960 && scrollPos < 1400) {
		aboutMenu.classList.add('highlight');
		homeMenu.classList.remove('highlight');
		skillsMenu.classList.remove('highlight');
		return;
	} else if (window.innerWidth > 960 && scrollPos < 2500) {
		skillsMenu.classList.add('highlight');
		aboutMenu.classList.remove('highlight');
		experienceMenu.classList.remove('highlight');
		return;
	} else if (window.innerWidth > 960 && scrollPos < 3600) {
		experienceMenu.classList.add('highlight');
		skillsMenu.classList.remove('highlight');
		catMenu.classList.remove('highlight');
		return;
	} else if (window.innerWidth > 960 && scrollPos < 5200) {
		catMenu.classList.add('highlight');
		experienceMenu.classList.remove('highlight');
		return;
	}

	if((elem && window.innerWidth < 960 && scrollPos < 600) || elem) {
		elem.classList.remove('highlight')
	}
}

window.addEventListener('scroll', highlightMenu)
window.addEventListener('click', highlightMenu)

//  Close mobile menu when clicked
const hideMobileMenu = () => {
	const menuBars = document.querySelector('.is-active');
	if (window.innerWidth <= 768 && menuBars) {
		menu.classList.toggle('is-active');
		menuLinks.classList.remove('active');
	}
};
  
menuLinks.addEventListener('click', hideMobileMenu);
navLogo.addEventListener('click', hideMobileMenu);


jQuery(document).ready(function($){
	//set animation timing
	var animationDelay = 3000;
	
	animateHeadline($('.hero__description'));
	
	function animateHeadline($headlines) {
		var duration = animationDelay;
		$headlines.each(function(){
			var headline = $(this);
			// assign to .cd-words-wrapper the width of its longest word
			// var words = headline.find('.cd-words-wrapper b'),
			// 	width = 0;
			// words.each(function(){
			// 	var wordWidth = $(this).width();
			// 	if (wordWidth > width) width = wordWidth;
			// });
			// headline.find('.cd-words-wrapper').css('width', width);
			//trigger animation
			setTimeout(function(){ hideWord( headline.find('.is-visible').eq(0) ) }, duration);
		});
	}

	function hideWord($word) {
		var nextWord = takeNext($word);
		switchWord($word, nextWord);
		setTimeout(function(){ hideWord(nextWord) }, animationDelay);
	}

	function takeNext($word) {
		return (!$word.is(':last-child')) ? $word.next() : $word.parent().children().eq(0);
	}

	function takePrev($word) {
		return (!$word.is(':first-child')) ? $word.prev() : $word.parent().children().last();
	}

	function switchWord($oldWord, $newWord) {
		$oldWord.removeClass('is-visible').addClass('is-hidden');
		$newWord.removeClass('is-hidden').addClass('is-visible');
	}
});


