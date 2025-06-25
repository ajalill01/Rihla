const menuBtn = document.getElementById('menu-btn')
const navLinks = document.getElementById('nav-links')
const menuBtnIcon = menuBtn.querySelector('i')

menuBtn.addEventListener('click',(e)=>{
    navLinks.classList.toggle('open')

    const isOpen = navLinks.classList.contains('open');
    menuBtnIcon.setAttribute('class',isOpen?"ri-close-line":"ri-menu-line")
})

navLinks.addEventListener('click',(e)=>{
    navLinks.classList.remove('open')
    menuBtnIcon.setAttribute("class","ri-menu-line")
})

const scrollRevealOption = {
    distance:"50px",
    origin:"bottom",
    duration : 800,
}

ScrollReveal().reveal(".header_image img",{
    ...scrollRevealOption,
    origin:"left"
})

ScrollReveal().reveal(".header_content p",{
    ...scrollRevealOption,
    delay : 800
})

ScrollReveal().reveal(".header_content h1",{
    ...scrollRevealOption,
    delay : 400
})

ScrollReveal().reveal(".header_content button",{
    ...scrollRevealOption,
    delay : 800
})

ScrollReveal().reveal(".header_image_card",{
    duration : 800,
    interval : 500,
    delay : 1400

})

const feedBtn = document.getElementById('feed-btn');
const feedForm = document.getElementById('form-feed')
const feedClose = document.getElementById('close-form')

feedBtn.addEventListener('click',()=>{
     feedForm.style.display = 'flex';
     feedBtn.style.display = 'none';
})

feedClose.addEventListener('click',()=>{
    feedForm.style.display = 'none';
    feedBtn.style.display = 'flex';
})