(($) => {
    $.fn.changeElementType = function (newType) {
        var attrs = {};

        $.each(this[0].attributes, function (idx, attr) {
            attrs[attr.nodeName] = attr.nodeValue;
        });

        this.replaceWith(function () {
            return $('<' + newType + '/>', attrs).append($(this).contents());
        });
    };

    window.theme = {
        ...window.theme,

        settings: {
            lastScrollPosition: 0,
            storeId: 0,
            productThumbs: null,
            productGallery: null,
        },

        /* Beginning General Functions */
        minicart: function () {
            if ($('.minicart').length > 0) {
                const cart = {
                    icons: {
                        remove: '<svg xmlns=http://www.w3.org/2000/svg fill=none width=14 height=16 viewBox="0 0 14 16"><path d="M11.19 15.73H2.35a1.42 1.42 0 01-1.38-1.45V4.73h.96v9.55a.45.45 0 00.42.49h8.84a.45.45 0 00.41-.49V4.73h.97v9.55a1.42 1.42 0 01-1.38 1.45zM12.95 3.65H.48a.48.48 0 010-.97h12.47a.48.48 0 010 .97z"/><path d="M8.22 5.58h.96v7.25h-.96V5.58zM4.35 5.58h.97v7.25h-.97V5.58zM9.18 2.13h-.91v-.9h-3v.9h-.92v-.9a.97.97 0 01.92-.96h3a.97.97 0 01.91.96v.9z"/></svg>',
                    },
                    storeID: $('html').data('store'),
                    hash: null,
                    Products: null, 
                    info: {}, 
                    currencyFormat: function (value) {
                        return new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                        }).format(value);
                    },
                    session: function () {
                        return $('html').data('session');
                    },

                    minicartHide: function () {
                        $('.minicart').attr('aria-hidden', true);
                    },

                    minicartShow: function () {
                        $('.minicart').attr('aria-hidden', false);
                    },

                    showAmount: function () {
                        const { amount } = this.info;
                        $('[data-cart="amount"]').text(amount);
                    },

                    mountCart: function () {
                        $('.minicart__main').html('');

                        let template;

                        if (this.Products) {
                            template = '<ul class="minicart__list">';

                            this.Products.forEach(
                                ({
                                    product_id,
                                    bought_together_id,
                                    variant_id,
                                    product_name,
                                    product_image,
                                    product_url,
                                    quantity,
                                    price,
                                }) => {
                                    let ids = JSON.stringify({
                                        product_id,
                                        ...(variant_id > 0 && { variant_id }),
                                        ...(bought_together_id > 0 && { bought_together_id }),
                                    }).replaceAll('"', "'");
                                    template += '<li class="minicart__item">';
                                    template += '<a class="minicart__link" href="' + product_url.https + '">';
                                    template +=
                                        '<figure class="minicart__frame"><img src="' +
                                        product_image.https +
                                        '" alt="' +
                                        product_name +
                                        '" height="100" width="100" loading="lazy"/></figure>';
                                    template +=
                                        '<h3 class="minicart__info"><strong class="minicart__name">' +
                                        product_name +
                                        '</strong>';
                                    template +=
                                        '<span class="minicart__qty">Quantidade: ' +
                                        quantity +
                                        '</span><span class="minicart__price">' +
                                        this.currencyFormat(price) +
                                        '</span></h3>';
                                    template += '</a>';
                                    template +=
                                        '<button class="minicart__remove" data-remove-ids="' +
                                        ids +
                                        '" aria-label="Remover produto do minicart" type="button">' +
                                        this.icons.remove +
                                        '</button>';
                                    template += '</li>';
                                }
                            );

                            template += '</ul>';
                        } else {
                            template = '<span class="minicart__empty" >Carrinho Vazio!</span>';
                        }

                        $('.minicart__main').append(template);
                        $('.minicart_subprice .subprice').html('R$ ' + this.info.price);
                    },

                    updateCart: function () {
                        $.get('/nocache/app.php?loja=' + this.storeID)
                            .then((res) => JSON.parse(res))
                            .done(({ hash }) => {
                                cart.hash = hash;
                                $.get('/mvc/store/cart/count?loja=' + this.storeID + '&hash=' + hash).done(
                                    ({ cart: { price, amount } }) => {
                                        this.info = { price, amount };
                                        this.getCart();
                                        this.showAmount();
                                    }
                                );
                            });
                    },

                    addProduct: function (product_id, quantity = 1, variant_id = 0) {
                        $.ajax({
                            method: 'POST',
                            url: '/web_api/cart/',
                            contentType: 'application/json; charset=utf-8',
                            data:
                                '{"Cart":{"session_id":"' +
                                this.session() +
                                '","product_id":"' +
                                product_id +
                                '","quantity":"' +
                                quantity +
                                '","variant_id":"' +
                                variant_id +
                                '"}}',
                        })
                            .done(() => {
                                this.updateCart();
                                this.minicartShow();
                            })
                            .fail(function ({ status, statusText }) {
                                console.error('[AddProduct]', status, '[Message]', statusText);
                            });
                    },

                    addCart: function () {
                        $(document).ajaxComplete((event, xhr, settings) => {
                            settings.type === 'POST' &&
                                settings.url.indexOf('cart_preview') !== -1 &&
                                this.updateCart();
                        });
                    },

                    getCart: function () {
                        $.get('/web_api/cart/' + this.hash)
                            .done((res) => {
                                this.Products = res.map(({ Cart }) => Cart);
                            })
                            .then(() => this.mountCart())
                            .fail(({ status, statusText }) => {
                                this.Products = null;
                                status === 404 && this.mountCart();
                                status !== 404 && console.error('[Code]', status, '[Message]', statusText);
                            });
                    },

                    deleteItem: function (product_id, variant_id, bought_together_id) {
                        let query = variant_id > 0 ? `/${product_id}/${variant_id}` : `/${product_id}`;

                        $.ajax('/web_api/carts/' + this.hash + (bought_together_id > 0 ? '' : query), {
                            type: 'DELETE',
                        })
                            .done(() => this.updateCart())
                            .fail(function ({ status, statusText }) {
                                console.error('[Delete]', status, '[Message]', statusText);
                            });
                    },
                    init: function () {
                        this.updateCart();
                        this.addCart();
                    },
                };

                // cart.init();
                cart.mountCart();

                $('#cart').on('click', function (e) {
                    e.preventDefault();
                    cart.minicartShow();
                });

                $(document).on('click', '.minicart__close.minicart__close--header', function (e) {
                    e.preventDefault();
                    cart.minicartHide();
                });
                $(document).on('click', '.minicart__close.minicart__close--footer', function (e) {
                    e.preventDefault();
                    cart.minicartHide();
                });

                // close modal when has a click outside
                $(document).on('click', '.minicart[aria-hidden="false"]', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    const { target, currentTarget } = e;

                    target === currentTarget && cart.minicartHide();
                });

                $(document).on('click', '.minicart__remove', function (e) {
                    e.preventDefault();
                    const { product_id, variant_id, bought_together_id } = JSON.parse(
                        $(this).data('remove-ids').replaceAll("'", '"')
                    );
                    cart.deleteItem(product_id, variant_id, bought_together_id);
                    $(this).closest('li').slideToggle();
                });

                $('.product__button').on('click', function () {
                    const productId = $(this).data('id');
                    const productQuant = $(this).parent().find('.buy-button__qty--value').val();
                    const productVar = $(this).attr('data-variant');
                    const msgError = $(this).closest('.product-price').find('.error-variants');
                    if (productVar === '') {
                        msgError.html(
                            '<span id="span_erro_carrinho" class="blocoAlerta"> Selecione uma op&#231;&#227;o para varia&#231;&#227;o do produto </span>'
                        );
                        return setTimeout(() => {
                            msgError.empty();
                        }, 2000);
                    }

                    return cart.addProduct(productId, productQuant, productVar);
                });

                return {
                    cart,
                };
            }
            $('.swiper-button-disabled').remove();
        },

        openApplyOverlayClose: function () {
            const buttonClose = $('[data-toggle="close"]');
            const divOverlay = $('[data-overlay="shadow"]');
            const buttonToOpen = $('[data-toggle="closed"]');

            buttonToOpen.on('click', function () {
                let target = $($(this).data('target'));
                target.addClass('u-show').attr('data-toggle', 'open');

                divOverlay.addClass('u-show');
                $('body').addClass('overflowed');

                buttonToOpen.addClass('u-show');
            });

            divOverlay.on('click', function () {
                $('.video iframe').attr('src', '');
                const modal = $('[data-toggle="open"]');

                modal.removeClass('u-show').removeAttr('data-toggle');
                divOverlay.removeClass('u-show');
                buttonToOpen.removeClass('u-show');
                $('body').removeClass('overflowed');
            });

            buttonClose.on('click', function () {
                divOverlay.trigger('click');
            });
        },

        footerToggle: function () {
            const mobileAplication = $(window).width();
            if (mobileAplication < 700) {
                $('.info-list, .info-time, .payment-list').hide();

                $('.info-title').each(function () {
                    $(this).on('click', function () {
                        const $toggleElements = $(this).siblings('.info-list, .info-time, .payment-list');

                        if ($toggleElements.is(':visible')) {
                            $toggleElements.hide(200);
                            $(this).find('svg').css({ transform: 'rotate(0)', transition: 'all 333ms' });
                        } else {
                            $toggleElements.show(200);
                            $(this).find('svg').css({ transform: 'rotate(90deg)', transition: 'all 333ms' });
                        }
                    });
                });
            }
        },

        backToTop: function () {
            $(window).scroll(function () {
                if ($(this).scrollTop() > 600) {
                    $('#_backToTop').attr('data-show', 'true');
                } else {
                    $('#_backToTop').attr('data-show', 'false');
                }
            });

            $('#_backToTop').on('click', function () {
                $('html, body').animate({ scrollTop: 0 }, 800);
                return false;
            });
        },
        dropdownTrack: function () {
            'use strict';

            const dropdownElems = document.querySelectorAll('.menu-dropdown'),
                btns = document.querySelectorAll('.menu-dropdown__btn');
            
            if (!btns[0]) return null;

            function preventOverflow() {
                if (window.innerWidth < 765) return null;
                const navEl = document.querySelector('nav#menu .menu__content'),
                    navR = +parseFloat(navEl.getBoundingClientRect().right - 30).toFixed(2);

                dropdownElems.forEach((dropdown) => {
                    const targetR = +parseFloat(dropdown.getBoundingClientRect().right).toFixed(2),
                        varL = +dropdown.style.getPropertyValue('--l').replace('px', ''),
                        positionLeft = targetR > navR ? (varL ? varL + (navR - targetR) : navR - targetR) : 0;
                    dropdown.style.setProperty('--l', parseFloat(positionLeft).toFixed(2) + 'px');
                });
            }

            function frameCheck(el) {
                const firstDataImg = el.parentElement.querySelector('[data-img]') ?? null,
                    firstDataUrl = el.parentElement.querySelector('[data-url]') ?? null;

                if (!firstDataImg || !firstDataUrl) {
                    el.remove();
                    return null;
                }

                el.classList.remove('empty');
                el.querySelector('a').href = firstDataUrl.dataset.url;
                el.querySelector('img').src = firstDataImg.dataset.img;
            }

            function hiddenScrollingButtons(parent) {
                const upBtn = parent.querySelector('.menu-dropdown__btn--scroll-up'),
                    downBtn = parent.querySelector('.menu-dropdown__btn--scroll-down'),
                    quantityItems = +parent.querySelectorAll('.menu-dropdown__btn').length - 2, // exclude up and down btn
                    heightBtn = +parseFloat(parent.scrollHeight / quantityItems).toFixed(2),
                    lastBtn = +parseFloat(parent.scrollHeight - heightBtn / 2),
                    checkIsInit = parent.scrollTop > heightBtn / 2,
                    checkIsEnd = parent.scrollTop + parent.offsetHeight > lastBtn;

                checkIsInit ? upBtn.classList.remove('_hide') : upBtn.classList.add('_hide');
                checkIsEnd ? downBtn.classList.add('_hide') : downBtn.classList.remove('_hide');
            }

            function actionMouseOver(event) {
                const elem = event.currentTarget,
                    frame = elem.closest('.menu-dropdown__content').querySelector('.menu-dropdown__frame');

                if (!frame) return null;

                const frameLink = frame.querySelector('a'),
                    frameImg = frameLink.querySelector('img'),
                    imgSrc = elem.dataset.img,
                    linkHref = elem.dataset.url;

                if (frameLink.href === linkHref || frameImg.src == imgSrc) return null;

                frameLink.href = linkHref;
                frameImg.src = imgSrc;
            }

            function actionMouseOverScrolling(options = {}) {
                const target = options.target ?? false;

                if (!target) return null;

                const btn = options.event.currentTarget;

                const step = +parseFloat(
                    target.scrollHeight / (+target.querySelectorAll('.menu-dropdown__btn').length - 2)
                ).toFixed(2);

                let timer = setInterval(() => {
                    options.toDown && (target.scrollTop = target.scrollTop + step);
                    options.toUp && (target.scrollTop = target.scrollTop - step);
                    btn.classList.contains('_hide') && clearInterval(timer);
                }, 555);

                btn.addEventListener('mouseout', () => clearInterval(timer));
            }

            function actionClick(event) {
                event.preventDefault();

                const elem = event.currentTarget,
                    targetId = elem.dataset.id,
                    frame =
                        elem.closest('.menu-dropdown').querySelector('.menu-dropdown__frame') ||
                        elem.closest('.menu-dropdown').querySelector('.menu-product');

                if (!targetId) return null;

                const nv = targetId.split('_').length,
                    wrappers = document.querySelectorAll('.menu-dropdown__wrapper'),
                    activeElem = elem.parentElement.querySelector('.active');

                wrappers.forEach((el) => {
                    const menuId = el.dataset.menuId,
                        elemShow = el.dataset.show === 'true';

                    nv === 1
                        ? elemShow && (el.dataset.show = 'false')
                        : elemShow && menuId.split('_').length === nv && (el.dataset.show = 'false');
                });

                document.querySelector(`.menu-dropdown__wrapper[data-menu-id="${targetId}"]`).dataset.show = 'true';
                if (frame) nv === 1 ? (frame.dataset.show = 'true') : (frame.dataset.show = 'false');
                activeElem && activeElem.classList.remove('active');
                elem.classList.add('active');
            }

            function actionScroll(el) {
                const elem = el.parentElement,
                    btnUp = elem.querySelector('.menu-dropdown__btn--scroll-up'),
                    btnDown = elem.querySelector('.menu-dropdown__btn--scroll-down');

                let lastPos = 0,
                    ticking = false;

                elem.addEventListener('scroll', (event) => {
                    lastPos = elem.scrollTop;

                    if (!ticking) {
                        window.requestAnimationFrame(() => {
                            hiddenScrollingButtons(elem);
                            ticking = false;
                        });
                        ticking = true;
                    }
                });

                btnUp.addEventListener(
                    'mouseover',
                    (e) => actionMouseOverScrolling({ event: e, target: elem, toUp: true }),
                    true
                );
                btnDown.addEventListener(
                    'mouseover',
                    (e) => actionMouseOverScrolling({ event: e, target: elem, toDown: true }),
                    true
                );
            }

            function actionReset(event) {
                const elem = event.currentTarget,
                    frame = elem.querySelector('.menu-dropdown__frame') || elem.querySelector('.menu-product');
                elem.querySelectorAll('.menu-dropdown__wrapper[data-show]').forEach(
                    (wrapper) => (wrapper.dataset.show = 'false')
                );
                elem.querySelectorAll('.menu-dropdown__list').forEach((list) => (list.scrollTop = 0));
                elem.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
                frame && (frame.dataset.show = 'true');
            }

            btns.forEach((btn) => {
                btn.classList.contains('menu-dropdown__btn--action') &&
                    btn.addEventListener('click', actionClick, false);

                btn.hasAttribute('data-img') && btn.addEventListener('mouseover', actionMouseOver, false);

                btn.classList.contains('menu-dropdown__btn--scroll-up') && actionScroll(btn);
            });

            dropdownElems.forEach((dropdown) => {
                const frame = dropdown.querySelector('.menu-dropdown__frame');

                dropdown.parentElement.addEventListener('mouseleave', actionReset, false);

                if (!frame) return null;

                frame.classList.contains('empty') && frameCheck(frame);
            });

            (window.onresize = () => preventOverflow()), preventOverflow();
        },

        menuProducts: function () {
            'use strict';

            const menuProducts = document.querySelectorAll('.menu-product');

            if (!menuProducts[0]) return null;

            menuProducts.forEach((item) => {
                const elSwiper = item.querySelector('.swiper');

                if (elSwiper) {
                    new Swiper(elSwiper, {
                        slidesPerView: 1,
                        autoplay: {
                            delay: 3000,
                            pauseOnMouseEnter: true,
                        }
                    });
                }
            });
        },

        mainMenuMobile: function () {
            $('[data-toggle="account"]').on('click', function (event) {
                let item = $(this).parent();

                item.toggleClass('u-show');
                event.preventDefault();
            });

            $('.menuMobile .menu-button').on('click', function () {
                $(this).toggleClass('open');
                $(this).next().slideToggle();
            });
        },

        libMaskInit: function () {
            let phoneMaskBehavior = function (val) {
                return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
            };

            let phoneMaskOptions = {
                onKeyPress: function (val, e, field, options) {
                    field.mask(phoneMaskBehavior.apply({}, arguments), options);
                },
            };

            $('.mask-phone').mask(phoneMaskBehavior, phoneMaskOptions);
            $('.mask-cep').mask('00000-000');
        },

        productCountdown: function () {
            $('.product-countdown').each(function () {
                var item = $(this);
                const endDateSplited = $(this).attr('data-endPromo').split('-');

                var finalDate = new Date(endDateSplited[0], endDateSplited[1] - 1, endDateSplited[2]);

                var finalCountdownDate = finalDate.getTime();

                var x = setInterval(function () {
                    var startCountdownDate = new Date().getTime();

                    var distance = parseInt(finalCountdownDate - startCountdownDate);

                    var days = parseInt(distance / (1000 * 60 * 60 * 24));
                    var hours = parseInt((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    var minutes = parseInt((distance % (1000 * 60 * 60)) / (1000 * 60));
                    var seconds = parseInt((distance % (1000 * 60)) / 1000);

                    $(item)
                        .find('.product-countdown-content')
                        .html(
                            `
                            <p class="product-countdown-text">TERMINA EM</p>

                            <p class="product-countdown-timer">
                                ${days}D ${hours} : ${minutes} : ${seconds}
                            </p>
                        `
                        );

                    if (distance < 0) {
                        clearInterval(x);
                        $(item)
                            .find('.product-countdown-content')
                            .html(`<p class="product-countdown-finished">PROMO&#x00C7;&#x00C3;O FINALIZADA</p>`);
                    }
                }, 1000);
            });
        },

        /* --- End General Functions --- */
        newsPageBtn: function () {
            $('.noticias > li').each(function () {
                let newsLink = $(this).find('a').attr('href');

                $(this)
                    .find('#noticia_dados')
                    .append(
                        `
                        <a href="${newsLink}" class="news-link">
                            Ler mais

                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none" viewBox="0 0 19 19">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.54" d="M3.33 9.25h12.34m-5.4-5.4 5.4 5.4-5.4 5.4"/>
                            </svg>
                        </a>
                    `
                    );
            });
        },

        noticesData: function () {
            setTimeout(function () {
                $('.news-item div h3').each(function () {
                    var textoH3 = $(this)
                        .contents()
                        .filter(function () {
                            return this.nodeType === 3;
                        })
                        .first();
                    var textoSemTraco = textoH3.text().replace('-', '');
                    textoH3.replaceWith(textoSemTraco);
                });
            }, 2000);
        },

        noticeSlide: function () {
            const swiper = new Swiper('.swiper-container', {
                slidesPerView: 3,
                loop: false,
                breakpoints: {
                    0: { slidesPerView: 1 },
                    600: { slidesPerView: 2 },
                    1000: { slidesPerView: 3 },
                },
            });
        },

        productSlides: function () {
            const targetElement = '[data-slides="product"]';

            $(targetElement).each(function () {
                var $section = $(this);
                var $showcase = $(this).find('.swiper').get(0);
                var perViews = $(this).data('col');
                var banner = $(this).data('banner');

                if (banner) {
                    new Swiper($showcase, {
                        loop: false,
                        lazy: {
                            loadPrevNext: true,
                        },
                        slidesPerView: 1.4,
                        spaceBetween: 6,
                        navigation: {
                            prevEl: $(this).find('.swiper_showcase-btn--prev').get(0),
                            nextEl: $(this).find('.swiper_showcase-btn--next').get(0),
                        },
                        breakpoints: {
                            542: {
                                slidesPerView: 2,
                            },
                            735: {
                                slidesPerView: 3,
                            },
                            786: {
                                slidesPerView: 1,
                            },
                            992: {
                                slidesPerView: 2,
                            },
                            1220: {
                                slidesPerView: 3,
                            },
                        },
                        on: {
                            init: function (swiper) {
                                const currentSlidesPerView =
                                        swiper.currentBreakpoint === 'max'
                                            ? swiper.passedParams.slidesPerView
                                            : swiper.passedParams.breakpoints[swiper.currentBreakpoint].slidesPerView,
                                    totalSlides = swiper.slides.length;

                                totalSlides > currentSlidesPerView
                                    ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                                    : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');

                                $section.addClass('show');
                            },
                            beforeResize: function (swiper) {
                                const currentSlidesPerView =
                                        swiper.currentBreakpoint === 'max'
                                            ? swiper.passedParams.slidesPerView
                                            : swiper.passedParams.breakpoints[swiper.currentBreakpoint].slidesPerView,
                                    totalSlides = swiper.slides.length;

                                totalSlides > currentSlidesPerView
                                    ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                                    : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');
                            },
                        },
                    });
                } else {
                    new Swiper($showcase, {
                        loop: false,
                        slidesPerView: 2,
                        spaceBetween: 6,
                        lazy: {
                            loadPrevNext: true,
                        },
                        navigation: {
                            prevEl: $(this).find('.swiper_showcase-btn--prev').get(0),
                            nextEl: $(this).find('.swiper_showcase-btn--next').get(0),
                        },
                        breakpoints: {
                            540: {
                                slidesPerView: 2,
                            },
                            735: {
                                slidesPerView: 3,
                            },
                            992: {
                                slidesPerView: perViews > 4 ? perViews - 1 : 4,
                            },
                            1235: {
                                slidesPerView: perViews,
                            },
                        },

                        on: {
                            init: function (swiper) {
                                const currentSlidesPerView =
                                        swiper.currentBreakpoint === 'max'
                                            ? swiper.passedParams.slidesPerView
                                            : swiper.passedParams.breakpoints[swiper.currentBreakpoint].slidesPerView,
                                    totalSlides = swiper.slides.length;

                                totalSlides > currentSlidesPerView
                                    ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                                    : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');

                                $section.addClass('show');
                            },

                            beforeResize: function (swiper) {
                                const currentSlidesPerView =
                                        swiper.currentBreakpoint === 'max'
                                            ? swiper.passedParams.slidesPerView
                                            : swiper.passedParams.breakpoints[swiper.currentBreakpoint].slidesPerView,
                                    totalSlides = swiper.slides.length;

                                totalSlides > currentSlidesPerView
                                    ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                                    : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');
                            },
                        },
                    });
                }
            });
        },

        productPromoSlides: function () {
            const targetElement = '[data-slides="productPromo"]';
            new Swiper(`${targetElement} .swiper`, {
                watchSlidesProgress: true,
                loop: false,
                allowTouchMove: true,
                lazy: {
                    loadPrevNext: true,
                },
                breakpoints: {
                    0: {
                        slidesPerView: 1,
                        spaceBetween: 10,
                    },
                    374: {
                        slidesPerView: 2,
                        spaceBetween: 10,
                    },
                    620: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                    820: {
                        slidesPerView: 4,
                        spaceBetween: 10,
                    },
                    1020: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                    1220: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                },
                navigation: {
                    prevEl: '.slides-buttonPrev--product.allProducts ',
                    nextEl: '.slides-buttonNext--product.allProducts',
                },
                on: {
                    init: function () {
                        $(targetElement).addClass('show');
                    },
                },
            });
        },

        productMenuImage: function () {
            var productMenuImagem = "[data-slides='product-menu'].swiper";
            var widthScreen = parseInt(window.innerWidth);
            var productMenuImagem = document.querySelector(productMenuImagem);
            if (!!productMenuImagem && widthScreen < 5000) {
                new Swiper(productMenuImagem, {
                    watchSlidesProgress: true,
                    direction: 'horizontal',
                    effect: 'slide',
                    slidesPerView: 1,
                    slidesPerGroup: 1,
                    freeMode: false,
                    loop: true,
                    rewind: true,
                    lazy: true,
                    allowTouchMove: true,

                    on: {
                        init: function () {
                            productMenuImagem.classList.add('show');
                        },
                    },
                });
            }
        },

        advantageSlides: function () {
            'use strict';

            const elem = document.querySelector('[data-slides="advantage"]');
            const elemTop = document.querySelector('[data-slides="advantage-top"]');

            if (elem) {
                new Swiper(elem.querySelector('.swiper'), {
                    effect: 'slide',
                    slidesPerView: 1,
                    freeMode: false,
                    loop: true,
                    lazy: true,
                    spaceBetween: 90,
                    allowTouchMove: true,

                    breakpoints: {
                        540: {
                            slidesPerView: 2,
                        },
                        786: {
                            slidesPerView: 3,
                        },
                        1100: {
                            slidesPerView: 4,
                        },
                    },

                    on: {
                        init: function () {
                            elem.classList.add('show');
                        },
                    },
                });
            }

            if (elemTop) {
                new Swiper(elemTop.querySelector('.swiper'), {
                    effect: 'slide',
                    centeredSlides: true,
                    loop: true,
                    lazy: true,
                    autoplay: {
                        delay: 4000,
                        disableOnInteraction: false,
                    },
                    on: {
                        init: function () {
                            elemTop.classList.add('show');
                        },
                    },
                });
            }
        },

        advantageSlidesHeader: function () {
            var advantageRuleClass = "[data-slides='advantagem'].swiper";
            var widthScreen = parseInt(window.innerWidth);
            var advantageRule = document.querySelector(advantageRuleClass);
            if (!!advantageRule && widthScreen < 5000) {
                new Swiper(advantageRuleClass, {
                    watchSlidesProgress: true,
                    direction: 'horizontal',
                    effect: 'slide',
                    slidesPerView: 1,
                    slidesPerGroup: 1,
                    freeMode: false,
                    loop: true,
                    rewind: true,
                    lazy: true,
                    allowTouchMove: false,
                    autoplay: {
                        delay: 3000,
                        disableOnInteraction: false,
                    },
                    on: {
                        init: function () {
                            advantageRule.classList.add('show');
                        },
                    },
                });
            }
        },

        bannerCenterMobile: function () {
            const targetElement = '[data-slides="banner-center"]';
            new Swiper(`${targetElement} .swiper`, {
                watchSlidesProgress: true,
                loop: true,
                allowTouchMove: true,
                lazy: {
                    loadPrevNext: true,
                },
                breakpoints: {
                    0: {
                        slidesPerView: 1,
                        spaceBetween: 10,
                    },
                    420: {
                        slidesPerView: 2,
                        spaceBetween: 10,
                    },
                    620: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                    820: {
                        slidesPerView: 4,
                        spaceBetween: 10,
                    },
                    1020: {
                        slidesPerView: 5,
                        spaceBetween: 10,
                    },
                    1220: {
                        slidesPerView: 6,
                        spaceBetween: 10,
                    },
                },
                navigation: {
                    prevEl: '.slides-buttonPrev--segmentation',
                    nextEl: '.slides-buttonNext--segmentation',
                },
                on: {
                    init: function () {
                        $(targetElement).addClass('show');
                    },
                },
            });
        },

        noticeSlides: function () {
            const targetElement = document.querySelector('[data-slides="notices"]');

            if (!targetElement) return null;

            new Swiper(targetElement.querySelector('.swiper'), {
                watchSlidesProgress: true,
                loop: false,
                lazy: {
                    loadPrevNext: true,
                },
                breakpoints: {
                    0: {
                        slidesPerView: 1,
                        spaceBetween: 10,
                    },
                    420: {
                        slidesPerView: 2,
                        spaceBetween: 10,
                    },
                    620: {
                        slidesPerView: 2,
                        spaceBetween: 10,
                    },
                    820: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                    1020: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                    1220: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                },
                pagination: {
                    el: targetElement.querySelector('.swiper-pagination'),
                    bulletClass: 'icon-circle',
                    bulletActiveClass: 'icon-circle-empty',
                    clickable: true,
                },
                on: {
                    init: function () {
                        $(targetElement).addClass('show');
                    },
                },
            });
        },

        commentSlides: function () {
            const elem = document.querySelector('.reviews');

            if (!elem) return null;

            new Swiper(elem.querySelector('.swiper'), {
                slidesPerView: 1,
                pagination: {
                    el: elem.querySelector('.swiper-pagination'),
                    bulletClass: 'icon-circle',
                    bulletActiveClass: 'icon-circle-empty',
                },
                breakpoints: {
                    0: {
                        slidesPerView: 1,
                    },
                    768: {
                        slidesPerView: 2,
                        spaceBetween: 15,
                    },
                    1040: {
                        slidesPerView: 3,
                        spaceBetween: 30,
                    },
                    on: {
                        init: function () {
                            elem.classList.add('show');
                        },
                    },
                },
            });
        },

        bannersExtraSlides: function () {
            const targetElement = '[data-slides="banners-extras"]';

            new Swiper(`${targetElement} .swiper`, {
                watchSlidesProgress: true,
                direction: 'horizontal',
                effect: 'slide',
                freeMode: false,
                loop: true,
                rewind: true,
                lazy: true,
                allowTouchMove: true,
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                },

                lazy: {
                    loadPrevNext: true,
                },
                breakpoints: {
                    0: {
                        slidesPerView: 1,
                        spaceBetween: 10,
                    },
                    420: {
                        slidesPerView: 1,
                        slidesPerGroup: 1,
                        spaceBetween: 10,
                    },
                    620: {
                        slidesPerView: 1,
                        slidesPerGroup: 1,
                        spaceBetween: 10,
                    },
                    820: {
                        slidesPerView: 1,
                        spaceBetween: 10,
                    },
                },
                on: {
                    init: function () {
                        $(targetElement).addClass('show');
                    },
                },
            });
        },

        bannerSlides: function () {
            const targetElement = '[data-slides="banner"]';
            if ($(targetElement).length) {
                const slideshow = $(targetElement);
                let size = $('.swiper-slide', slideshow).length;
                let settings = slideshow.data('settings');

                if (size > 0) {
                    new Swiper(`${targetElement} .swiper`, {
                        watchSlidesProgress: true,
                        preloadImages: false,
                        loop: true,
                        autoHeight: true,
                        effect: 'slide',
                        autoplay: {
                            delay: settings.timer,
                            disableOnInteraction: false,
                        },
                        lazy: {
                            loadPrevNext: true,
                        },
                        pagination: {
                            el: `${targetElement} .swiper-pagination`,
                            bulletClass: 'icon-circle',
                            bulletActiveClass: 'icon-circle-empty',
                            clickable: !settings.isMobile,
                        },

                        navigation: {
                            prevEl: '.icon-arrow-left',
                            nextEl: '.icon-arrow-right',
                        },
                        on: {
                            init: function (swiper) {
                                $(targetElement)
                                    .find('.swiper-slide-duplicate img[fetchpriority]')
                                    .removeAttr('fetchpriority')
                                    .attr('loading', 'lazy');
                            },
                        },
                    });

                    if (settings.stopOnHover) {
                        $(`${targetElement} .swiper`).on('mouseenter', function () {
                            this.swiper.autoplay.stop();
                        });

                        $(`${targetElement} .swiper`).on('mouseleave', function () {
                            this.swiper.autoplay.start();
                        });
                    }
                }
            }
        },

        brandsSlides: function () {
            'use strict';

            const targetElement = document.querySelector('[data-slides="brands"]');

            if (!targetElement) return null;

            const autoplay = Boolean(+targetElement.dataset.auto)
                ? { delay: 5000, disableOnInteraction: false }
                : false;

            new Swiper(targetElement.querySelector('.swiper'), {
                slidesPerView: 1,
                spaceBetween: 15,
                loop: true,
                autoplay,
                breakpoints: {
                    366: {
                        slidesPerView: 2,
                    },
                    531: {
                        slidesPerView: 3,
                    },
                    753: {
                        slidesPerView: 4,
                    },
                    945: {
                        slidesPerView: 5,
                    },
                    1135: {
                        slidesPerView: 6,
                    },
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                on: {
                    init: function (swiper) {
                        const currentSlidesPerView =
                                swiper.currentBreakpoint === 'max'
                                    ? swiper.passedParams.slidesPerView
                                    : swiper.passedParams.breakpoints[swiper.currentBreakpoint].slidesPerView,
                            totalSlides = swiper.slides.length;

                        totalSlides > currentSlidesPerView
                            ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                            : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');

                        targetElement.classList.add('show');
                    },

                    beforeResize: function (swiper) {
                        const currentSlidesPerView =
                                swiper.currentBreakpoint === 'max'
                                    ? swiper.passedParams.slidesPerView
                                    : swiper.passedParams.breakpoints[swiper.currentBreakpoint].slidesPerView,
                            totalSlides = swiper.slides.length;

                        totalSlides > currentSlidesPerView
                            ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                            : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');
                    },
                },
            });
        },

        customerReviewsSlidesOnHome: function () {
            const targetElement = '[data-slides="reviews"]';

            if (!$(targetElement).length) {
                $(`${targetElement} .dep_lista`).remove();
            } else {
                $('.dep_lista').changeElementType('div');
                $('.dep_item').changeElementType('div');

                $('.dep_item').addClass('swiper-slide');
                $(`${targetElement} .dep_lista`).addClass('swiper-wrapper').wrap('<div class="swiper"></div>');
                $(`${targetElement} .swiper`).append(`
                    <div class="swiper-pagination"></div>
                `);

                const swiper = new Swiper(`${targetElement} .swiper`, {
                    watchSlidesProgress: true,
                    slidesPerView: 3,
                    loop: false,
                    breakpoints: {
                        0: {
                            slidesPerView: 1,
                        },
                        600: {
                            slidesPerView: 2,
                        },
                        1000: {
                            slidesPerView: 3,
                        },
                    },
                    pagination: {
                        el: `${targetElement} .swiper-pagination`,
                        bulletClass: 'icon-circle',
                        bulletActiveClass: 'icon-circle-empty',
                        clickable: true,
                    },
                    on: {
                        init: function () {
                            $(targetElement).addClass('show');
                        },
                    },
                });

                $(`${targetElement} .dep_dados`).wrap('<div class="review"></div>');
                $(`${targetElement} .dep_lista li:hidden`).remove();
            }
        },

        toggleSmartFilter: function () {
            if ($('.catalog-content--location1').length == 0) {
                if (window.innerWidth > 768) {
                    if ($('.filter').length) {
                        $('.filter-section').each(function () {
                            let filter = $(this);
                            filter.on('mouseover', function () {
                                filter.find('.filter-title').addClass('rotate');
                                filter.find('.filter-list').addClass('visible');
                            });
                            filter.on('mouseout', function () {
                                filter.find('.filter-title').removeClass('rotate');
                                filter.find('.filter-list').removeClass('visible');
                            });
                        });
                    }
                } else {
                    if ($('.filter').length) {
                        $('.filter-section').each(function () {
                            let filter = $(this);
                            filter.find('.filter-title').on('click', function () {
                                if ($(this).hasClass('rotate')) {
                                    $(this).removeClass('rotate');
                                    filter.find('.filter-list').removeClass('visible');
                                } else {
                                    $(this).addClass('rotate');
                                    filter.find('.filter-list').addClass('visible');
                                }
                            });
                        });
                    }
                }
            } else {
                $('.filter-title').on('click', function () {
                    $(this).siblings('.filter-list').toggle();

                    var icon = $(this).find('svg');

                    if ($(this).siblings('.filter-list').is(':visible')) {
                        icon.css({ transform: 'rotate(0)', transition: 'all 333ms' });
                    } else {
                        icon.css({ transform: 'rotate(180deg)', transition: 'all 333ms' });
                    }
                });
            }
        },

        removeFilter: function () {
            $('.filter-checkbox input').each(function () {
                if ($(this).attr('checked')) {
                    let removeId = $(this).attr('id');
                    let removeValue = `
                            <span class="filter-remove--value">
                                ${removeId}
                                <svg width="10" height="10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.53 1.53A.75.75 0 1 0 8.47.47l1.06 1.06ZM.47 8.47a.75.75 0 0 0 1.06 1.06L.47 8.47Zm1.06-8A.75.75 0 0 0 .47 1.53L1.53.47Zm6.94 9.06a.75.75 0 1 0 1.06-1.06L8.47 9.53Zm0-9.06-8 8 1.06 1.06 8-8L8.47.47Zm-8 1.06 8 8 1.06-1.06-8-8L.47 1.53Z" fill="#49545A"/>
                                </svg>
                            </span>
                    `;

                    $('.filter-remove').append(removeValue);

                    $('.filter-results').css('display', 'flex');
                }
            });

            $('.filter-remove--value').on('click', function () {
                let removingValue = $(this).text();
                $('.filter-checkbox input').each(function () {
                    if ($.trim(removingValue) == $(this).attr('id')) {
                        $(this).removeAttr('checked');
                        $('.filter .filter-button').click();
                    }
                });
            });
        },

        seeDesc: function () {
            var description = $('.catalog-description');
            var button = $('#toggleButton');

            button.on('click', function () {
                if (description.hasClass('expanded')) {
                    description.removeClass('expanded');
                    description.css('max-height', '43px');
                    button.text('Ler Mais');
                } else {
                    description.addClass('expanded');
                    description.css('max-height', description[0].scrollHeight + 'px');
                    button.text('Ler Menos');
                }
            });
        },

        loadNewsPageOnHome: function () {
            if ($('.news').length) {
                let dataFiles = $('html').data('files');

                $.ajax({
                    url: `/loja/busca_noticias.php?loja=${this.settings.storeId}&${dataFiles}`,
                    method: 'get',
                    success: function (response) {
                        let target;
                        let pageNews;

                        if (!$(response).find('.noticias').length) {
                            $('.section.news').remove();
                            return;
                        }

                        target = $('.section.news .news-content');
                        pageNews = $($(response).find('.noticias'));

                        pageNews.find('li:nth-child(n+5)').remove();
                        pageNews.find('li').wrapInner('<div class="news-item"></div>');
                        pageNews.find('li').addClass('swiper-slide');
                        pageNews.find('.news-item').each(function () {
                            $(this).find('#noticia_imagem img').attr('loading', 'lazy');
                            $(this)
                                .find('#noticia_imagem a')
                                .attr('title', $(this).find('#noticia_dados h3 a').text().trim());
                            $(this)
                                .find('#noticia_imagem img')
                                .attr(
                                    'alt',
                                    $(this).find('#noticia_dados h3 a').text().trim() + ' imagem representativa'
                                );
                        });
                        pageNews = pageNews.contents();

                        target.append(pageNews);
                    },
                });
            }
        },

        /* Beginning Product Page */
        gallerySlidesOnProductPage: function () {
            'use strict';

            const galleryMain = document.querySelector('[data-slides="gallery-main"]'),
                galleryThumbs = document.querySelector('[data-slides="gallery-thumbs"]');

            if (!galleryMain || !galleryThumbs) return null;

            function initSwiper() {
                const thumbsSwiper = new Swiper(galleryThumbs.querySelector('.swiper'), {
                    watchSlidesProgress: true,
                    slidesPerView: 4,
                    spaceBetween: 10,
                    on: {
                        init: function (swiper) {
                            const totalSlides = swiper.slides.length,
                                slidesPerView = swiper.passedParams.slidesPerView;

                            totalSlides > slidesPerView
                                ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                                : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');

                            galleryThumbs.classList.add('show');
                        },
                    },
                });

                const mainSwiper = new Swiper(galleryMain.querySelector('.swiper'), {
                    thumbs: {
                        swiper: thumbsSwiper,
                    },
                    on: {
                        init: function () {
                            initZoom(galleryMain);
                        },
                    },
                });
            }

            function initZoom(elem) {
                elem.querySelectorAll('.swiper-slide').forEach((slide) => {
                    slide.addEventListener('mousemove', zoom);
                    slide.addEventListener('touchmove', zoom);
                });

                function zoom(e) {
                    const imageBack = e.currentTarget.querySelector('img');

                    if (imageBack) {
                        const imageZoom = imageBack.getAttribute('src');
                        let offsetX,
                            offsetY = null;
                        e.offsetX ? (offsetX = e.offsetX) : (offsetX = e.touches[0].pageX);
                        e.offsetY ? (offsetY = e.offsetY) : (offsetX = e.touches[0].pageX);
                        let x = +((offsetX / elem.offsetWidth) * 100).toFixed(2);
                        let y = +((offsetY / elem.offsetHeight) * 100).toFixed(2);
                        elem.style.backgroundPosition = x + '% ' + y + '%';
                        elem.style.backgroundImage = `url('${imageZoom}')`;
                        imageBack.addEventListener('mouseout', function () {
                            elem.removeAttribute('style');
                        });
                    }
                }
            }

            async function variantsImg(varId) {
                try {
                    const response = await fetch(`/web_api/variants/${varId}`, {
                        method: 'GET',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    });
                    if (!response.ok) {
                        throw response;
                    }
                    const {
                        Variant: { VariantImage },
                    } = await response.json();
                    return VariantImage;
                } catch ({ status, statusText }) {
                    console.warning('[status]:', status, ' - ', statusText);
                    return [];
                }
            }

            async function renderNewImagesByVariant() {
                const variantId = +document.getElementById('selectedVariant').value,
                    attrInfo = {},
                    templateSlide = (img) =>
                        `<div class="swiper-slide"><img src="${img.src}" width="${img.width}" height="${img.height}" alt="${img.alt}" /></div>`;

                if (!variantId) return null;

                const arrayImg = await variantsImg(variantId);

                if (!arrayImg[0]) return null;

                galleryThumbs.querySelectorAll('img').forEach((item, i) => {
                    i === 0 && (attrInfo.thumb = { width: item.width, height: item.height, alt: item.alt });
                    item.parentElement.remove();
                });

                galleryMain.querySelectorAll('img').forEach((item, i) => {
                    i === 0 && (attrInfo.main = { width: item.width, height: item.height, alt: item.alt });
                    item.parentElement.remove();
                });

                galleryMain.querySelector('.swiper').swiper.destroy(true, false);

                galleryThumbs.querySelector('.swiper').swiper.destroy(true, false);

                arrayImg.forEach(({ https, thumbs }) => {
                    attrInfo.main = { src: https };
                    attrInfo.thumb = { src: thumbs[180].https };
                    galleryThumbs.querySelector('.swiper-wrapper').innerHTML += templateSlide(attrInfo.thumb);
                    galleryMain.querySelector('.swiper-wrapper').innerHTML += templateSlide(attrInfo.main);
                });

                initSwiper();
            }

            initSwiper();

            listenerAjaxRequest('/variant_gallery/', renderNewImagesByVariant);

        },

        toggleProductVideoModal: function () {
            const video = $('[data-button="video"]');
            const modal = $('[data-modal="video"]');
            const closeButton = $('#modals-video .close-modal');

            closeButton.on('click', function () {
                modal.toggleClass('u-show');
            });

            video.on('click', function () {
                modal.find('iframe').addClass('lazyload').attr('src', $(this).data('url'));
                modal.toggleClass('u-show');
            });
        },

        getQuantityChangeOnProductPage: function () {
            const buttonQtd = $('[data-quantity]');

            if (
                !$('[data-has-variations]')[0] ||
                ($('[data-buy-product="box"] div#quantidade label')[0] && !$('[data-has-variations]')[0])
            ) {
                $('[data-quantity]').addClass('u-show');
            }

            $(document).on('click', 'input[data-quantity]', function (event) {
                event.preventDefault();

                let inputQtd = $('[data-buy-product="box"] #quantidade input#quant');

                let valueQtd = parseInt(inputQtd.val());
                const operator = $(event.target).val();
                const number = parseInt(`${operator}1`);
                valueQtd += number;

                if (valueQtd < 1 || Number.isNaN(valueQtd)) {
                    inputQtd.val(1);
                } else {
                    inputQtd.val(valueQtd);
                }
            });
        },

        generateShippingToProduct: function () {
            const shippingForm = $('[data-shipping="form"]');
            const resultBox = $('[data-shipping="result"]');

            shippingForm.on('submit', function (event) {
                event.preventDefault();
                let variant = $('#form_comprar').find('input[type="hidden"][name="variacao"]');
                let url = $('#shippingSimulatorButton').data('url');
                let inputQtd = $('#quant:visible');
                let cep = $('input', this).val().split('-');

                if (inputQtd.is(':visible')) {
                    inputQtd = inputQtd.val();
                }

                if (variant.length && variant.val() === '') {
                    resultBox
                        .addClass('loaded')
                        .html(
                            `<p class="error-block">Por favor, selecione as varia&ccedil;&otilde;es antes de calcular o frete.</p>`
                        );
                    return;
                }

                variant = variant.val() || 0;

                url = url
                    .replace('cep1=%s', `cep1=${cep[0]}`)
                    .replace('cep2=%s', `cep2=${cep[1]}`)
                    .replace('acao=%s', `acao=${variant}`)
                    .replace('dade=%s', `dade=${inputQtd}`);

                resultBox.removeClass('loaded').addClass('loading');

                function insertShippingInTable(shippingResult) {
                    shippingResult.find('table:first-child, p, table tr td:first-child').remove();
                    shippingResult
                        .find('table, table th, table td')
                        .removeAttr('align class width border cellpadding cellspacing height colspan');

                    shippingResult.find('table').addClass('shipping-table');

                    var frete = shippingResult.find('table th:first-child').text();
                    if (frete == 'Forma de Envio:') {
                        shippingResult.find('table th:first-child').html('Frete');
                    }

                    var valor = shippingResult.find('table th:nth-child(2)').text();
                    if (valor == 'Valor:') {
                        shippingResult.find('table th:nth-child(2)').html('Valor');
                    }

                    var prazo = shippingResult.find('table th:last-child').text();
                    if (prazo == 'Prazo de Entrega e Observa&ccedil;&otilde;es:') {
                        shippingResult.find('table th:last-child').html('Prazo');
                    }
                    shippingResult = shippingResult.children();
                }

                const errorMessage =
                    'N&atilde;o foi poss&iacute;vel obter os pre&ccedil;os e prazos de entrega. Tente novamente mais tarte.';

                /* Validate zip code first using viacep web service */
                $.ajax({
                    url: `https://viacep.com.br/ws/${cep[0] + cep[1]}/json/`,
                    method: 'get',
                    dataType: 'json',
                    success: function (viacepResponse) {
                        if (viacepResponse.erro) {
                            const message = 'CEP inv&aacute;lido. Verifique e tente novamente.';
                            resultBox
                                .removeClass('loading')
                                .addClass('loaded')
                                .html(`<p class="error-block">${message}</p>`);

                            return;
                        }

                        $.ajax({
                            url: url,
                            method: 'get',
                            success: function (response) {
                                if (response.includes('N&atilde;o foi poss&iacute;vel estimar o valor do frete')) {
                                    resultBox
                                        .removeClass('loading')
                                        .addClass('loaded')
                                        .html(`<p class="error-block">${errorMessage}</p>`);

                                    return;
                                }

                                let shippingRates = $(response.replace(/Prazo de entrega: /gi, ''));
                                insertShippingInTable(shippingRates);

                                resultBox.removeClass('loading').addClass('loaded').html('').append(shippingRates);
                            },
                            error: function (request, status, error) {
                                console.error(`[Theme] Could not recover shipping rates. Error: ${error}`);

                                if (request.responseText !== '') {
                                    console.error(`[Theme] Error Details: ${request.responseText}`);
                                }

                                resultBox
                                    .removeClass('loading')
                                    .addClass('loaded')
                                    .html(`<p class="error-block">${errorMessage}</p>`);
                            },
                        });
                    },
                    error: function (request, status, error) {
                        console.error(`[Theme] Could not validate cep. Error: ${error}`);
                        console.error(`[Theme] Error Details: ${request.responseJSON}`);

                        resultBox
                            .removeClass('loading')
                            .addClass('loaded')
                            .html(`<p class="error-block">${errorMessage}</p>`);
                    },
                });

                return false;
            });
        },

        productReview: function () {
            /**Div produtos visitados */
            setTimeout(function () {
                $('.visitados_produtos div ul li').each(function () {
                    $(this).children('h3, span').wrapAll("<div class='product-visitade-main'></div>");
                });
            }, 1000);
        },

        organizeProductPage: function () {
            /**Border info product */
            if ($('#produto_preco .color').length > 0) {
                $('.pageProduct-outOfStock .produto-preco #preco').css({
                    border: ' 1px solid var(--c_general_main)',
                    'background': 'var(--c_product_progressive_bg)',
                });
            }

            const additionalFieldSelector = $('.varCont .dd .ddTitle');
            $(document).on('click', '.varCont .dd', function () {
                $(this).toggleClass('active');
            });

            additionalFieldSelector.attr('tabindex', 0);
        },

        closeSelectorBoxProductPage: function () {
            var closeSelectorBox = jQuery('.varCont .dd .ddChild');

            if (closeSelectorBox && closeSelectorBox[0]) {
                closeSelectorBox[0].style.display = 'none';
            }
        },

        adjustOpenTabs: function (content, linksDesk, linksMobile) {
            jQuery('.pageProduct-measures').hide();

            jQuery('.nav-link.measures').on('click', function () {
                if (jQuery(this).hasClass('active')) {
                    jQuery('.pageProduct-measures').toggle();
                } else {
                    jQuery('.pageProduct-measures').hide();
                }
            });

            const openContent = $('.tabs .tabs-content.active');

            if ($(window).width() < 768 && openContent.length > 0) {
                openContent.hide().removeClass('active');
                linksDesk.removeClass('active');
                linksMobile.removeClass('active');
                content.slideUp().removeClass('active');
            } else if ($(window).width() >= 768) {
                const firstLink = linksDesk.first();
                const target = firstLink.attr('href').split('#')[1];

                openContent.hide().removeClass('active');
                firstLink.addClass('active');
                linksMobile.removeClass('active');
                $(`#${target}`).show().addClass('active');
            }
        },

        goToProductReviews: function () {
            var avaliacaoProduto = document.querySelector('#form-comments');
            var adjust = 0;

            if ($(window).width() < 768) {
                adjust = 60;
            } else {
                adjust = 120;
            }

            $('.rating-message').on('click', function () {
                avaliacaoProduto.scrollIntoView({ behavior: 'smooth' }) + adjust;
            });
        },

        chooseProductReview: function () {
            $('#form-comments .rateBlock .starn').on('click', function () {
                const message = $(this).data('message');
                const rating = $(this).data('id');

                $(this).parent().find('#rate').html(message);
                $(this).closest('form').find('#nota_comentario').val(rating);

                $(this).parent().find('.starn').removeClass('icon-star');

                $(this).prevAll().addClass('icon-star');

                $(this).addClass('icon-star');
            });
        },

        sendProductReview: function () {
            $('#form-comments').on('submit', function (event) {
                const form = $(this);

                $.ajax({
                    url: form.attr('action'),
                    method: 'post',
                    dataType: 'json',
                    data: form.serialize(),
                    success: function (response) {
                        form.closest('.tabs-content.comments').find('.blocoAlerta').hide();
                        form.closest('.tabs-content.comments').find('.blocoSucesso').show();

                        setTimeout(function () {
                            form.closest('.tabs-content.comments').find('.blocoSucesso').hide();
                            $('#form-comments #mensagem_coment').val('');

                            form.find('#nota_comentario').val('');
                            form.find('#rate').html('');

                            form.find('.starn').removeClass('icon-star');
                        }, 8000);
                    },
                    error: function (response) {
                        const error = JSON.stringify(response);

                        form.closest('.tabs-content.comments').find('.blocoSucesso').hide();
                        form.closest('.tabs-content.comments').find('.blocoAlerta').html(error).show();
                    },
                });

                event.preventDefault();
            });
        },

        reviewsOnProductPage: function () {
            let commentsBlock = $(`<div class="tabs-reviews">${window.commentsBlock}</div>`);
            const buttonReview =
                '<button type="submit" class="submit-review button2">Enviar Avalia&ccedil;&atilde;o</button>';
            const star = '<span class="icon-star" aria-hidden="true"></span>';
            const starEmpty = '<span class="icon-star-empty" aria-hidden="true"></span>';

            commentsBlock.find('.hreview-comentarios + .tray-hide').remove();

            $.ajax({
                url: '/mvc/store/greeting',
                method: 'get',
                dataType: 'json',
                success: function (response) {
                    if (!Array.isArray(response.data)) {
                        commentsBlock.find('#comentario_cliente form.tray-hide').removeClass('tray-hide');

                        commentsBlock.find('#form-comments #nome_coment').val(response.data.name);
                        commentsBlock.find('#form-comments #email_coment').val(response.data.email);

                        commentsBlock.find('#form-comments [name="ProductComment[customer_id]"]').val(response.data.id);
                    } else {
                        commentsBlock.find('#comentario_cliente a.tray-hide').removeClass('tray-hide');
                    }

                    $('#tray-comment-block').before(commentsBlock);

                    $('#form-comments #bt-submit-comments').before(buttonReview).remove();

                    $('.ranking .rating').each(function () {
                        let review = Number(
                            $(this)
                                .attr('class')
                                .replace(/[^0-9]/g, '')
                        );

                        for (let i = 1; i <= 5; i++) {
                            if (i <= review) {
                                $(this).append(star);
                            } else {
                                $(this).append(starEmpty);
                            }
                        }
                    });

                    $('#tray-comment-block').remove();

                    theme.chooseProductReview();
                    theme.sendProductReview();
                },
            });
        },

        buyTogetherOnProductPage: function () {
            const boxImages = $('.compreJunto form .fotosCompreJunto');
            const image = $('.compreJunto .produto img');
            const qtd = $('.compreJunto .precoCompreJunto .unidades_preco .unidades_valor');
            const spansLinksRemove = $(
                '.compreJunto .precoCompreJunto div:first-child> span, .compreJunto .precoCompreJunto div:first-child> a, .compreJunto .precoCompreJunto div:first-child > br'
            );
            let listQtd = [];

            boxImages.append('<div class="plus color to">=</div>');

            qtd.each(function () {
                const value = $(this).text();
                listQtd.push(value);
            });


            image.each(function (index) {
                const link = $(this).parent().attr('href') || '';
                const name = $(this).attr('alt');

                $(this).addClass('buyTogether-img lazyload');

                if (link !== '') {
                    $(this).unwrap();
                    $(this).parents('span').after(`<a class="buyTogether-nameProduct" href="${link}">${name}</a>`);
                } else {
                    $(this).parents('span').after(`<p class="buyTogether-nameProduct">${name}</p>`);
                }

                if (listQtd[index] == 1) {
                    $(this).after(`<p class="buyTogether-text">${listQtd[index]} unidade</p>`);
                } else {
                    $(this).after(`<p class="buyTogether-text">${listQtd[index]} unidades</p>`);
                }
            });

            boxImages.each(function () {
                if (window.innerWidth > 768) {
                    const observer = new ResizeObserver((entries) => {
                        const { contentRect } = entries[0];
                        $(this).parent().find('.wrapper-plus').css({ height: contentRect.height });
                    });

                    observer.observe(jQuery(this).get(0));
                }
            });

            $('.pageProduct-buyTogether').removeClass('tray-hide');
        },

        tabNavigationOnProductPage: function () {
            'use strict';

            const tabsContent = document.querySelectorAll('.product-tabs__content[data-action-url]'),
                tabsCustom = document.querySelectorAll('#hidden_tab > [id]');

            tabsContent.forEach(async (content) => {
                const url = content.dataset.actionUrl,
                    html = await renderHTMLByContentUrl(url);

                content.innerHTML = html;

                if (url.indexOf('/payment_options') !== -1) paymentsMethodsRestructuring();
            });

            tabsCustom.forEach((custom) => {
                const targetId = custom.id.replace('AbaPersonalizadaConteudo', 'AbaPersonalizadaLink');
                custom.removeAttribute('class');
                custom.removeAttribute('style');
                document
                    .getElementById(targetId)
                    .insertAdjacentElement('afterbegin', custom.querySelector(':scope > div'));
            });

            async function renderHTMLByContentUrl(url) {
                let html = null;
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    });

                    if (!response.ok) {
                        throw response;
                        return null;
                    }
                    const data = await response.arrayBuffer();

                    const decoder = new TextDecoder('iso-8859-1');

                    html = decoder.decode(data);
                } catch ({ status, statusText }) {
                    console.error('[Error]:', status, ' - ', statusText);
                    html = 'Error';
                }
                return html;
            }

            function paymentsMethodsRestructuring() {
                const elem = document.querySelector('.product-tabs__content #atualizaFormas'),
                    parentElem = elem.closest('.product-tabs__content');
                if (!elem) return null;
                elem.querySelectorAll('table').forEach((table) => {
                    const imgEl = table.querySelector('img'),
                        parentTd = imgEl.parentElement,
                        parentTable = table.parentElement,
                        wrapperEl = document.createElement('DIV');

                    parentTable.querySelector(':scope > a[id]').insertAdjacentElement('afterbegin', imgEl);
                    table.querySelectorAll('[width]').forEach((td) => td.removeAttribute('width'));
                    wrapperEl.insertAdjacentElement('afterbegin', table);
                    parentTable.insertAdjacentElement('beforeend', wrapperEl);
                    parentTd.remove();
                    parentElem.innerHTML = '';
                    parentElem.insertAdjacentElement('afterbegin', elem);
                });
            }

            async function changePaymentMethods() {
                const variantId = +document.getElementById('selectedVariant').value,
                    elem = document.querySelector('[data-action-url*="payment_options"]');

                if (!elem || !variantId) return null;
                const indexVarId = elem.dataset.actionUrl.indexOf('IdVariacao=') + 'IdVariacao='.length,
                    currentId = +elem.dataset.actionUrl.slice(indexVarId),
                    url = elem.dataset.actionUrl.slice(0, indexVarId);

                if (currentId === variantId) return null;

                const newUrl = url + variantId,
                    newHtml = await renderHTMLByContentUrl(newUrl);

                elem.innerHTML = newHtml;

                paymentsMethodsRestructuring();
            }

            document.getElementById('hidden_tab').remove();

            jQuery('.product-tabs__link').on('click', function (e) {
                e.preventDefault();
                jQuery(this).toggleClass('hide');
                jQuery(this).parent().next().slideToggle();
            });

            jQuery(document).on('click', '#atualizaFormas a[id]', function () {
                jQuery(this).toggleClass('open');
                jQuery(this).next().slideToggle();
            });

            listenerAjaxRequest('/variant_price/', changePaymentMethods);

            function corridorAnimation(target) {
                const a = $(target).offset();
                const b = $(target).innerWidth();
                const c = b / 2 + a.left;
                const d = $(target).closest('.u-desktop').width();
                const f = $('body').width();
                const g = Math.abs((d - f) / 2);
                const h = $(target).innerWidth() * 0.75;
                const i = Math.abs(g - c);
                const j = i - h / 2;
            }


        },

        variantImagesUpdate: function () {
            // ! check this later
            return null;

            async function promiseProductVariantImage(id) {
                let urlImageAux = '';
                let url = `/web_api/variants/${id}`;

                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error('Erro na requisição');
                    }

                    const data = await response.json();
                    const urls = data.Variant.VariantImage;
                    urlImageAux = urls;

                    return urlImageAux;
                } catch (error) {
                    console.error('Erro:', error);
                    throw error;
                }
            }
            async function updateProductVariantImage(dataId) {
                const newImageUrls = await promiseProductVariantImage(dataId);

                LoadImages(newImageUrls);
            }

            function LoadImages(urls) {
                const thumbSwiper = theme.settings.productThumbs;
                const galerySwiper = theme.settings.productGallery;

                const productContainer = $('.product-container');

                productContainer.empty();

                const wrapperGalerry = galerySwiper.wrapperEl;
                const zoom = wrapperGalerry.getAttribute('data-zoom');

                while (thumbSwiper.slides.length > 0 || galerySwiper.slides.length > 0) {
                    thumbSwiper.removeSlide(0);
                    galerySwiper.removeSlide(0);
                }

                urls.forEach(function (url) {
                    if (zoom === 'onZoom') {
                        var gallerySlide = `<div class="swiper-slide gallery-image" data-gallery="image" >
                                                <figure class="goOnZoom " id="goOnZoom" onmousemove="zoom(event)" >
                                                    <img id="imageZoom" class="gallery-img" src="${url.https}" alt="Imagem da Varia&#x00E7;&#x00E3;o"/>
                                                </figure>
                                            </div>`;
                    } else {
                        var gallerySlide = `<div class="swiper-slide gallery-image" data-gallery="image">
                                                <img class="gallery-img" src="${url.https}" alt="Imagem da Varia&#x00E7;&#x00E3;o"/>
                                            </div>`;
                    }
                    galerySwiper.appendSlide(gallerySlide);

                    var thumbSlide = `<div class="swiper-slide gallery-thumb" data-gallery="image">
                                            <img class="gallery-img" src="${url.https}" alt="Imagem da Variação" width="83px" height="83px" />
                                        </div>`;
                    thumbSwiper.appendSlide(thumbSlide);
                });

                galerySwiper.update();
                thumbSwiper.update();
            }

            const productVariationBox = $('.pageProduct-variants');
            productVariationBox.on('click', '.lista_cor_variacao li[data-id]', function () {
                let dataId = $(this).data('id');
                if (dataId) {
                    var urls = updateProductVariantImage(dataId);
                }
            });

            productVariationBox.on('click', '.lista-radios-input', function () {
                let dataId = $(this).find('input').val();
                if (dataId) {
                    var urls = updateProductVariantImage(dataId);
                }
            });

            productVariationBox.on('change', 'select', function () {
                let dataId = $(this).val();
                if (dataId) {
                    var urls = updateProductVariantImage(dataId);
                }
            });

            setTimeout(() => {
                $('.varCont .dd .ddChild .enabled').on('click', function () {
                    let selected = jQuery('.varCont .dd .ddChild .enabled.selected img');
                    let newImageUrls = [{ https: selected[0].src }];
                    LoadImages(newImageUrls);
                });
            }, 200);
        },

        variantSpot: function () {
            $('.product-variations-colors-content li').on('click', function () {
                let newImageSpot = $('.img-variants-id').attr('src');
                let imgPrincipal = $('.product-image > a > img');

                imgPrincipal.append('src', newImageSpot);
            });
        },

        variantsSwipper: function () {
            const targetElement = '[data-slides="variants-home"]';

            new Swiper(`${targetElement} .swiper`, {
                watchSlidesProgress: true,
                loop: false,
                slidesPerView: 2,
                spaceBetween: 10,
                breakpoints: {
                    0: {
                        slidesPerView: 1,
                        spaceBetween: 10,
                    },
                    420: {
                        slidesPerView: 2,
                        spaceBetween: 10,
                    },
                    620: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                    820: {
                        slidesPerView: 3,
                        spaceBetween: 10,
                    },
                    1020: {
                        slidesPerView: 4,
                        spaceBetween: 10,
                    },
                    1220: {
                        slidesPerView: 4,
                        spaceBetween: 10,
                    },
                },
                navigation: {
                    prevEl: '.segmentation-arrows.slides-buttonPrev--variants',
                    nextEl: '.segmentation-arrows.slides-buttonNext--variants',
                },
                on: {
                    init: function () {
                        $(targetElement).addClass('show');
                    },
                },
            });
        },

        variationOpenScope: function () {
            $(document).ready(function () {
                var valorCor = $('#vars0').text().trim();
                $('#opcoes0 .labelMultiVariacao').each(function () {
                    if ($(this).find('input[type="checkbox"]').length === 0) {
                        $(this).text(valorCor + ' ' + $(this).text().trim());
                    }
                });
            });
        },

        testandofuncao: function () {
            $(document).ready(function () {
                $('div.labelMultiVariacao').each(function () {
                    $('#vars0').css('display', 'block');
                    $('.openScope .varCont ul').css('border', '1px solid');
                });

                $('span.labelMultiVariacao').each(function () {
                    $('#vars0').css('display', 'none');
                    $('.openScope .varCont ul').css('border', 'none');
                    $('.openScope .varCont ul li.color').css('border', '1px solid');
                });
            });
        },

        variationOpenScopeMulti: function () {
            if ($('div#quantidade label').length == 0) {
                $('#quantidade').css('display', 'none');
            }
        },

        variationOpenScopeKit: function () {
            $(document).ready(function () {
                $('.varTit').each(function () {
                    var valorCor = $(this).text().trim();

                    var varCont = $(this).siblings('.varCont');

                    varCont.find('ul li label span').each(function () {
                        if ($(this).closest('li').hasClass('color')) {
                            $(this).prepend(valorCor + ' ');
                        }
                    });
                });
            });
        },

        arrowsHide: function () {
            $('.lista_cor_variacao li').on('click', function () {
                var aLength = $('.pageProduct-gallery .gallery-thumbs .swiper-wrapper').length;
                if (aLength < 6) {
                    $('.pageProduct-gallery .slides-buttonNext--gallery').remove();
                    $('.pageProduct-gallery .slides-buttonPrev--gallery').remove();
                    $('.pageProduct-gallery .gallery-thumbs').addClass('noArrows');
                }
            });
        },

        /* --- End Product Page Organization --- */
        /* Beginning Pages Tray Organization */
        processRteVideoAndTable: function () {
            $(`.col-panel .tablePage,
                .page-extra .page-content table,
                .page-extras .page-content table,
                .board_htm table,
                .rte table,
                .page-noticia table
            `).wrap('<div class="table-overflow"></div>');

            $(`.page-noticia iframe[src*="youtube.com/embed"],
                .page-noticia iframe[src*="player.vimeo"],
                .board_htm iframe[src*="youtube.com/embed"],
                .board_htm iframe[src*="player.vimeo"],
                .rte iframe[src*="youtube.com/embed"],
                .rte iframe[src*="player.vimeo"]
            `).wrap('<div class="rte-video-wrapper"></div>');
        },

        insertBreadcrumbNavigationInPage: function (local = '', customName = false) {
            let items;
            let breadcrumb = '';
            let pageName = document.title.split(' - ')[0].split(' | ')[0];

            if (local === 'listNews') {
                if (!window.location.href.includes('busca_noticias')) {
                    items = [
                        { text: 'Home', link: '/' },
                        { text: 'Not&iacute;cias', link: '/noticias' },
                    ];
                } else {
                    items = [
                        { text: 'Home', link: '/' },
                        { text: 'Not&iacute;cias', link: '/noticias' },
                        { text: 'Todas as Not&iacute;cias', link: '/busca_noticias' },
                    ];
                }
            } else if (local === 'news') {
                items = [
                    { text: 'Home', link: '/' },
                    { text: 'Not&iacute;cias', link: '/noticias' },
                    { text: pageName },
                ];
            } else if (local === 'wishlist') {
                items = [
                    { text: 'Home', link: '/' },
                    { text: 'Lista de Desejos', link: '/listas' },
                ];
            } else if (local != '' && customName === true) {
                items = [{ text: 'Home', link: '/' }, { text: local }];
            } else {
                items = [{ text: 'Home', link: '/' }, { text: pageName }];
            }

            $.each(items, function (index, item) {
                if (this.link) {
                    breadcrumb += `
                        <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                            <a itemprop="item" class="breadcrumb-link" href="${item.link}">
                                <span itemprop="name">${item.text}</span>
                            </a>
                            <meta itemprop="position" content="${index + 1}" />
                        </li>
                        `;
                } else {
                    breadcrumb += `
                        <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                            <span itemprop="name">${item.text}</span>
                            <meta itemprop="position" content="${index + 1}" />
                        </li>
                    `;
                }
            });

            $('.default-content > .container').prepend(`
                <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
                    ${breadcrumb}
                </ol>
            `);
        },

        toggleShowReviewsForm: function () {
            let item = $('[data-toggle="reviews"]').parent();
            item.toggleClass('u-show');
        },

        validateFormFieldsToSendCustomerReview: function () {
            const formToSendReview = $('.page-depoimentos .container3 #depoimento');
            const buttonToSendReview = $('.page-depoimentos .container3 #depoimento .btn_submit');

            formToSendReview.validate({
                rules: {
                    nome_depoimento: {
                        required: true,
                    },
                    email_depoimento: {
                        required: true,
                        email: true,
                    },
                    msg_depoimento: {
                        required: true,
                    },
                    input_captcha: {
                        required: true,
                    },
                },
                messages: {
                    nome_depoimento: {
                        required: 'Por favor, informe seu nome completo',
                    },
                    email_depoimento: {
                        required: 'Por favor, informe seu e-mail',
                        email: 'Por favor, preencha com um e-mail v&aacute;lido',
                    },
                    msg_depoimento: {
                        required: 'Por favor, escreva uma mensagem no seu depoimento',
                    },
                    input_captcha: {
                        required: 'Por favor, preencha com o c&oacute;digo da imagem de verifica&ccedil;&atilde;o',
                    },
                },
                errorElement: 'span',
                errorClass: 'error-block',
            });

            buttonToSendReview.on('click', function () {
                const button = $(this);

                if (formToSendReview.valid()) {
                    button.html('Enviando...').attr('disabled', true);
                }
            });


            let target = $('#aviso_depoimento').get(0);
            let config = { attributes: true };

            let observerReviewMessage = new MutationObserver(function () {
                buttonToSendReview.html('Enviar Depoimento').removeAttr('disabled');
            });

            observerReviewMessage.observe(target, config);
        },

        organizeContactUsPage: function () {
            const textPageContact = $('.page-contact .default-content > .container');
            const buttonPageContact = $('.page-contact #btn_submit img.image');
            const inputTelPageContact = $('.page-contact #telefone_contato');
            const textEmailPageContact = $('.page-contact .email-texto');
            const tel01PageContact = $('.page-contact .contato-telefones .block:nth-child(1)');
            const tel02PageContact = $('.page-contact .contato-telefones .block:nth-child(2)');

            textPageContact.prepend(`
                <h1>Fale conosco</h1>
                <p class="contactUs-description">Precisa falar com a gente? Utilize uma das op&ccedil;&otilde;es abaixo para entrar em contato conosco.</p>
            `);
            buttonPageContact.parent().text('Enviar Mensagem').addClass('button2').children().remove();
            inputTelPageContact.removeAttr('onkeypress maxlength').addClass('mask-phone');
            textEmailPageContact.parent().wrap('<div class="contactUs-email"></div>');

            if (tel01PageContact.length) {
                let phoneNumberFormatted = tel01PageContact.text();
                let phoneNumber = phoneNumberFormatted.replace(/\D/g, '');

                tel01PageContact.unwrap().parent().addClass('contactUs-phone')
                    .html(`<h3>Central de Atendimento ao Cliente</h3>
                    <a href="tel:${phoneNumber}" title="Ligue para n&oacute;s">${phoneNumberFormatted}</a>`);
            }

            if (tel02PageContact.length) {
                let phoneNumberFormatted = tel02PageContact.text();
                let phoneNumber = phoneNumberFormatted.replace(/\D/g, '');

                tel02PageContact
                    .wrap('<div class="contactUs-whats"></div>')
                    .parent()
                    .insertAfter('.page-contact .contactUs-phone').html(`<h3>WhatsApp</h3>
                        <a target="_blank" tray-wp rel="noopener noreferrer" href="https://api.whatsapp.com/send?l=pt&phone=55" title="Fale conosco no WhatsApp"></a>`);
            }
        },

        validateFormFieldsToSendContactEmail: function () {
            const formToSendContact = $('.page-contact .container2 .formulario-contato');
            const buttonToSendContact = $('.page-contact .container2 .formulario-contato .btn_submit');

            formToSendContact.validate({
                rules: {
                    nome_contato: {
                        required: true,
                    },
                    email_contato: {
                        required: true,
                        email: true,
                    },
                    mensagem_contato: {
                        required: true,
                    },
                },
                messages: {
                    nome_contato: {
                        required: 'Por favor, informe seu nome completo',
                    },
                    email_contato: {
                        required: 'Por favor, informe seu e-mail',
                        email: 'Por favor, preencha com um e-mail v&aacute;lido',
                    },
                    mensagem_contato: {
                        required: 'Por favor, escreva uma mensagem para entrar em contato',
                    },
                },
                errorElement: 'span',
                errorClass: 'error-block',
            });
            buttonToSendContact.on('click', function () {
                const button = $(this);

                if (formToSendContact.valid()) {
                    button.html('Enviando...').attr('disabled', true);
                }
            });
        },

        organizeNewsletterRegistrationPage: function () {
            if ($('.page-newsletter .formulario-newsletter').length) {
                $(
                    '.page-newsletter .formulario-newsletter .box-captcha input, .page-newsletter .formulario-newsletter .box-captcha-newsletter input'
                )
                    .attr('placeholder', 'Digite o c&oacute;digo ao lado')
                    .trigger('focus');
                $('.formulario-newsletter .newsletterBTimg').html('Enviar').removeClass().addClass('button2');
            } else {
                $('.page-newsletter .default-content').addClass('success-message-newsletter');
                $('.page-newsletter .default-content.success-message-newsletter .board p:first-child a')
                    .addClass('button2')
                    .html('Voltar para p&aacute;gina inicial');
            }

            setTimeout(function () {
                $('.page-newsletter .default-content').addClass('u-show');
            }, 200);
        },

        organizeNewsPage: function () {
            const titleButtonPage = $('.page-busca_noticias #listagemCategorias b');
            if (!window.location.href.includes('busca_noticias')) {
                titleButtonPage.replaceWith('<h1>Not&iacute;cias</h1>');
            }
        },

        organizePagesTray: function () {
            const login = $('.caixa-cadastro #email_cadastro');
            const buttonReviewPage = $('.page-depoimentos .container .btn_submit');
            const titleReviewPage = $('.page-depoimentos .container #comentario_cliente');
            const buttonAdvancedSearch = $('.page-search #Vitrine input[type="image"]');

            login.attr('placeholder', 'Digite seu e-mail*');
            buttonReviewPage.html('Enviar Depoimento').addClass('button2 review-button');
            titleReviewPage.prepend(
                '<button class="review-form" data-toggle="reviews">Deixe seu depoimento sobre n&#x00F3;s <span class="icon-arrow-simple" aria-hidden="true"></span></button>'
            );
            buttonAdvancedSearch.after('<button type="submit" class="button2">BUSCAR</button>');
            buttonAdvancedSearch.remove();
        },

        /* --- End Pages Tray Organization --- */

        /* To Action in ajax.html */
        updateCartTotal: function (e) {
             $('[data-cart="amount"]').text($('.cart-preview-item').length);
        },

        customizationProductPage: function () {
            $('.product-variations').each(function () {
                if ($(this).find('ul').length == 0) {
                    $(this).remove();
                    $('.related-item > .product').css({ 'min-height': '550px', 'max-height': '550px' });
                    $('.pageProduct-related .related-item .product-info span .product__buttons').css({ top: '26em' });
                    $('.product-button').remove();
                }
            });
            setTimeout(function () {
                $('.pageProduct-lastSeen .lastSeen-list #produtos li .product-visitade-main .ValoresLista').css(
                    'display',
                    'block'
                );
                $('.pageProduct-lastSeen .lastSeen-list #produtos li').css({"display": "flex"," flex-direction": "column",  "justify-content": "center" , "align-items": "center", "width": "43%"});
            }, 2000);
            $('.product-visitade-main .ValoresLista .precode').remove();
            setTimeout(function () {
                $('#produtos ul').each(function () {
                    $(this)
                        .find('.txt-corparcelas, .preco-de, .txt-cadaparcelas, .operadora, .txt-forma-pagamento')
                        .slice(5)
                        .remove();
                });
            }, 1000);

            const more = $('.pageProduct-buy').find('.more').clone(true, true);
            const less = $('.pageProduct-buy').find('.less').clone(true, true);

            function appendMoreAndLess() {
                if ($.contains($('#quantidade').get(0), $('#more').get(0))) {
                    return false;
                }

                $('.pageProduct-buy').find('#less,#more').remove();

                $('#quantidade').append(more, less);
            }

            $(document).ajaxComplete(function (event, request, settings) {
                settings.url.indexOf('/variant_form') !== -1 && appendMoreAndLess();
            });

            $('#quantidade').append($('.pageProduct-buy').find('.less,.more'));

            $('input#email_avise').attr('placeholder', 'Seu e-mail');

            var qtdValidate = $('#quantidade');
            if (qtdValidate.length == 0) {
                $('.buy-quantityTop').remove();
                $('.buy-quantityDown').remove();
            }
        },

        pricefilter: function () {
            function debounce(cb, delay = 0) {
                let timeout;
                return (...args) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        cb(...args);
                    }, delay);
                };
            }

            if ($('.filter__price').length > 0) {
                let $parent = $('.filter__price'),
                    showMin = $parent.find('input[name="min"]'),
                    showMax = $parent.find('input[name="max"]'),
                    ranges = $parent.find('.input-range__input');

                function stringCurrency(number) {
                    return new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                    }).format(number);
                }

                $('.filter input[name]').on('input change', function () {
                    $('.filter__form').submit();
                });

                const submitPrices = debounce((min, max) => {
                    $parent
                        .find('input[type="hidden"]')
                        .prop('disabled', false)
                        .val(min + ',' + max)
                        .trigger('change');
                }, 0);

                $('.input-range__input').on('change input', function () {
                    let a = Number(ranges[0].value),
                        b = Number(ranges[1].value),
                        min = a < b ? a : b,
                        max = a > b ? a : b;

                    showMin.val(stringCurrency(min));
                    showMax.val(stringCurrency(max));
                    submitPrices(min, max);
                });
            }

            if ($('.input-range').length > 0) {
                let $parent = $('.input-range');

                function rangeInfo() {
                    let a = Number($parent.find('input')[0].value),
                        b = Number($parent.find('input')[1].value),
                        max = $parent.data('max'),
                        min = $parent.data('min'),
                        currV = Math.abs(a - b),
                        currM = Math.abs(min - max),
                        minV = a < b ? a : b,
                        setL = 100 - ((currM - (minV - min)) * 100) / currM,
                        setW = (currV * 100) / currM;

                    $parent.css({ '--max': setW.toFixed(2), '--min': setL.toFixed(2) });
                }

                $('.input-range__input').on('change input', () => rangeInfo());

                rangeInfo();
            }
        },

        imgNewsDefault: function () {
            $('#noticia_imagem > a > img').each(function () {
                var noImage = String($(this).attr('src'));
                var linkImage = $('body').attr('data-imgOffNews');
                if (noImage.includes('imgoff')) {
                    $(this).attr('src', linkImage);
                }
            });
        },

        fillTimer: function (target) {
            let $timer = $(target),
                limit = Number($timer.data('limiter')),
                time = Number($timer.attr('data-count')),
                total = Number($timer.find('circle:first-of-type').attr('stroke-dashoffset')),
                dashOffset = total - (total * time) / limit;

            $timer.find('circle:last-of-type').attr('stroke-dashoffset', dashOffset);
        },

        startCountdown: function () {
            var countdownElement = document.querySelector('.countdownShowcase');

            if (countdownElement) {
                let showcaseDate = document.querySelector('.countdownShowcase').dataset.date;
                let showcaseTime = document.querySelector('.countdownShowcase').dataset.time;
                var endDate = new Date(showcaseDate + 'T' + showcaseTime);

                var countdownInterval = setInterval(function () {
                    let currentDate = new Date();
                    let timeRemaining = parseInt(endDate.getTime()) - parseInt(currentDate.getTime());

                    if (timeRemaining <= 0) {
                        countdownElement.remove();
                        clearInterval(countdownInterval);
                        return;
                    }

                    let days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                    let hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    let minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                    let seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

                    let daysDiv = document.querySelector('.countdownShowcase__counter').children[0].children[0];
                    let hoursDiv = document.querySelector('.countdownShowcase__counter').children[1].children[0];
                    let minutesDiv = document.querySelector('.countdownShowcase__counter').children[2].children[0];
                    let secondsDiv = document.querySelector('.countdownShowcase__counter').children[3].children[0];

                    daysDiv.setAttribute('data-count', days);
                    theme.fillTimer(daysDiv);
                    daysDiv.style.setProperty('--content-value', `'${days}'`);

                    hoursDiv.setAttribute('data-count', hours);
                    theme.fillTimer(hoursDiv);
                    hoursDiv.style.setProperty('--content-value', `'${hours}'`);

                    minutesDiv.setAttribute('data-count', minutes);
                    theme.fillTimer(minutesDiv);
                    minutesDiv.style.setProperty('--content-value', `'${minutes}'`);

                    secondsDiv.setAttribute('data-count', seconds);
                    theme.fillTimer(secondsDiv);
                    secondsDiv.style.setProperty('--content-value', `'${seconds}'`);
                }, 1000);
            }
        },

        fixSubmitComment: function () {
            $(document).on('ajaxComplete', function (event, xhr, settings) {
                if (settings && settings.url.indexOf('add_comment') !== -1) {
                    const target = document.querySelector('.pageProduct-comments'),
                        headerHeight = document.querySelector('header').getBoundingClientRect().height;
                    window.scroll({ top: target.offsetTop - headerHeight - 30, behavior: 'smooth' });
                }
            });
        },

        opensearch: function () {
            $('.search-input').on('click', function () {
                $('.header-search').css({
                    'max-width': '620px',
                    transition: '1s all',
                });
            });
            $('.search-input').blur(function () {
                $('.header-search').css({
                    'max-width': '0px',
                    transition: '1s all',
                });
            });
        },

        searchInput: function () {
            const searchInput = document.querySelector('.search-input');
            const searchCancel = document.querySelector('.search-cancel');

            searchCancel.addEventListener('click', function () {
                searchInput.value = '';
            });
            searchInput.addEventListener('focus', function () {
                searchCancel.setAttribute('data-focus', 'on');
            });
            searchInput.addEventListener('blur', function () {
                setTimeout(function () {
                    searchCancel.setAttribute('data-focus', 'off');
                }, 100);
            });
        },

        bodyMeasurement: function () {
            const overlay = document.getElementById('bodyMeasurement');
            if (!overlay) return;

            const removeIds = overlay.dataset.invalid ? overlay.dataset.invalid.split(',') : [],
                validId = overlay.dataset.valid.replace('#', ''),
                images = document.getElementById(validId).querySelectorAll('img'),
                content = overlay.querySelector('.body-measurement__content');

            ['data-valid', 'data-invalid'].forEach((attr) => overlay.removeAttribute(attr));

            images[0] && (images[1] && images[0].classList.add('desktop'), content.appendChild(images[0]));
            images[1] && (images[1].classList.add('mobile'), content.appendChild(images[1]));

            !images[0] && (overlay.remove(), document.querySelector('a.body-measurement__link').remove());

            document.getElementById(validId).remove();

            removeIds[0] && removeIds.forEach((item) => document.getElementById(item.replace('#', '')).remove());

            function setAspectRatio(mobile) {
                if (!images[0]) return;

                const ar =
                    mobile && images[1]
                        ? { w: images[1].width, h: images[1].height }
                        : { w: images[0].width, h: images[0].height };

                content.style.aspectRatio = `${ar.w}/${ar.h}`;
            }

            window.matchMedia('(max-width: 736px)').onchange = (e) => setAspectRatio(e.matches);

            setAspectRatio(window.matchMedia('(max-width: 736px)').matches);
        },

        autoPlay: function () {
            if ($('.gallery-video[data-auto-play=true]').length > 0) {
                const url = $('.gallery-video').data('url');

                const autoplayUrl = `${url}&autoplay=1&mute=1`;

                const video = `
                    <div class="swiper-slide video">
                        <iframe width="560" height="315" src="${autoplayUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                    </div>
                `;
                const gallery = new Swiper('.gallery-images');

                gallery.appendSlide(video);

                const icon = `
                    <div class="swiper-slide icon">
                        <svg width="79.45" height="55" viewBox="0 0 256 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_19_23)">
                            <path d="M250.346 28.075C248.878 22.6486 246.014 17.7014 242.039 13.7263C238.064 9.75112 233.117 6.88661 227.69 5.418C207.824 0 127.87 0 127.87 0C127.87 0 47.9122 0.164 28.0462 5.582C22.6197 7.0507 17.6726 9.91536 13.6976 13.8907C9.72263 17.8661 6.85841 22.8134 5.39019 28.24C-0.618808 63.538 -2.94981 117.324 5.55519 151.21C7.02356 156.636 9.88785 161.584 13.8628 165.559C17.8378 169.534 22.7848 172.398 28.2112 173.867C48.0772 179.285 128.033 179.285 128.033 179.285C128.033 179.285 207.988 179.285 227.853 173.867C233.28 172.399 238.227 169.534 242.202 165.559C246.177 161.584 249.042 156.637 250.51 151.21C256.848 115.862 258.801 62.109 250.346 28.075Z" fill="#FF0000"/>
                            <path d="M102.421 128.06L168.749 89.642L102.421 51.224V128.06Z" fill="white"/>
                            </g>
                            <defs>
                            <clipPath id="clip0_19_23">
                            <rect width="256" height="180" fill="white"/>
                            </clipPath>
                            </defs>
                        </svg>
                    </div>
                `;

                const thumbs = new Swiper('.gallery-thumbs');

                thumbs.appendSlide(icon);

                let lastDiv = $('.gallery-thumbs > .swiper-wrapper').children().last();
                let lastVideo = $('.gallery-images > .swiper-wrapper').children().last();

                lastVideo.prependTo('.gallery-images > .swiper-wrapper');
                lastDiv.prependTo('.gallery-thumbs > .swiper-wrapper');
            }
        },

        process: function () {
            if ($('.buy-button').length > 0) {
                window.process = function (quant) {
                    var value = parseInt(document.getElementById('quant').value);
                    value += quant;
                    if (value < 1) {
                        document.getElementById('quant').value = '01';
                    } else {
                        document.getElementById('quant').value = String(value).padStart(2, '0');
                    }
                };
            }
        },

        productSpotQuickBuy: function () {
            'use strict';

            const hasQuickBuy = document.querySelector('.product-actions--quick-buy');

            if (!hasQuickBuy) return null;

            console.info('%c[Quick Buy Activated]', 'color: #e8de35; font-weight: bold; background: #1d1d1d;');

            const buyButtons = document.querySelectorAll('button.product-actions__btn--buy:not([onclick])'), // product kit that has the attribute onclik
                selectcsVariations = document.querySelectorAll('select.product-variations__select'),
                colorsVariations = document.querySelectorAll('span.product-variations__color-item:not(.no-stock)'),
                colorsSwiper = document.querySelectorAll('.product-variations__color[data-swiper="true"]');

            window.handleQuantity = (elem, value) => {
                const parent = elem.parentElement,
                    input = parent.querySelector('input[type="number"]'),
                    maxValue = +input.getAttribute('max'),
                    currentValue = +input.value,
                    sum = currentValue + +value,
                    newValue = !maxValue ? sum : sum <= 0 ? 1 : sum > maxValue ? maxValue : sum;

                sum > maxValue && popupMessage(parent, 'Limite m\u00e1ximo atingido!');

                input.value = newValue;
            };

            colorsVariations.forEach((item) => item.addEventListener('click', handleEvent, false));

            selectcsVariations.forEach((select) => select.addEventListener('change', handleEvent, false));

            buyButtons.forEach((button) => button.addEventListener('click', handleBuy, false));

            colorsSwiper.forEach((swiper) => initColorSlider(swiper));

            function handleEvent(e) {
                const { currentTarget: target } = e;
                const tag = target.tagName;
                const data = JSON.parse(
                    target.closest('.product-variations').querySelector('script[data-options]').textContent
                );

                const varName = tag === 'SELECT' ? target.value : tag === 'SPAN' ? target.dataset.value : null;

                actionVariations({ name: varName, tag, target, data });
            }

            function actionVariations(options = {}) {
                const { name, tag, target, data } = options;

                const filter = dataFilter(data, name);

                const nextElem = target.nextElementSibling ?? false;

                const nextTag = nextElem && nextElem.tagName;

                tag === 'SPAN' && variationColors(target);

                filter.constructor.name === 'Object' && variationSetup(filter, target);

                nextElem && filter.constructor.name === 'Array' && renderSecondaryVariation(nextElem, nextTag, filter);
            }

            function variationSetup(options, target) {
                const parent = target.closest('.product');

                const {
                    id,
                    stock,
                    prices: { old, current, payments },
                } = options;
                const inputQty = parent.querySelector('.product-actions__qty--input');

                const templatePrice = `${
                    old ? '<s>de: ' + old + '<s/>' : ''
                }<span class="product-price__current">Por: <em>${current}</em></span>`;

                inputQty.getAttribute('max') && +inputQty.value > stock && (inputQty.value = stock);

                inputQty.getAttribute('max') && inputQty.setAttribute('max', stock);

                parent.querySelector('.product-price').innerHTML = templatePrice;
                parent.querySelector('.product-price__installments').innerHTML = payments;
                parent.querySelector('.product-actions__btn--buy').dataset.varId = id;
            }

            function dataFilter(data, name) {
                const names = name.split(',');

                return data.reduce((acc, obj) => {
                    if (obj.name.every((item) => names.includes(item))) {
                        acc = { id: obj.id, prices: obj.prices, stock: obj.stock };
                    } else if (obj.name.includes(name)) {
                        acc.push({ ...obj });
                    }

                    return acc;
                }, []);
            }

            function variationColors(elem) {
                elem.closest('div.product-variations__color')
                    .querySelectorAll('.selected')
                    .forEach((selected) => selected.classList.remove('selected'));
                elem.classList.add('selected');
            }

            function renderSecondaryVariation(target, type, data) {
                const size = +data.length;

                type === 'SELECT' && clearOptionsNotFirst(target.querySelectorAll('option'));

                type === 'DIV' && clearSpanElements(target, size);

                data.forEach(({ name, url, stock, sell_without_stock }) => {
                    type === 'SELECT' && renderOptions(target, name, stock, !sell_without_stock);

                    type === 'DIV' && renderSpans(target, name, stock, url, size, !sell_without_stock);
                });

                // Add listener to new elements
                type === 'DIV' &&
                    target
                        .querySelectorAll('span:not(.no-stock)')
                        .forEach((item) => item.addEventListener('click', handleEvent, false));

                type === 'DIV' && size > 4 && initColorSlider(target);

                type === 'DIV' && target.classList.remove('disabled');

                type === 'SELECT' && target.removeAttribute('disabled');

                target.removeAttribute('title');
            }

            function renderOptions(parent, name, stock, check) {
                const templateOption = `<option ${check && +stock <= 0 ? 'disabled' : ''} value="${name.toString()}">${
                    name[1]
                }</option>`;

                parent.insertAdjacentHTML('beforeend', templateOption);
            }

            function renderSpans(parent, name, stock, url, size, check) {
                const isSlider = size > 4;

                const templateSpan = `${
                    isSlider ? '<div class="swiper-slide">' : ''
                }<span data-value="${name.toString()}" class="product-variations__color-item${
                    check && +stock <= 0 ? ' no-stock' : ''
                }"><img src="${url}" alt="Cor ${name[1]}" height="30" width="30" /></span>${isSlider ? '</div>' : ''}`;

                isSlider
                    ? parent.querySelector('.swiper-wrapper').insertAdjacentHTML('beforeend', templateSpan)
                    : parent.insertAdjacentHTML('beforeend', templateSpan);
            }

            function clearOptionsNotFirst(elements) {
                elements.forEach((elem, i) => i !== 0 && elem.remove());
            }

            function clearSpanElements(parent, size) {
                const swiperTemplate = `<div class=swiper_color-prev><svg fill=none height=12 viewBox="0 0 12 12"width=12 xmlns=http://www.w3.org/2000/svg><path d="M6.2.2c.14.14.22.32.22.53 0 .21-.06.39-.2.53L2.55 4.93h8.38c.21 0 .4.07.54.22.14.14.21.32.21.53a.73.73 0 0 1-.75.75H2.55l3.67 3.68c.14.13.2.3.2.52 0 .21-.08.39-.21.53a.71.71 0 0 1-.53.2.71.71 0 0 1-.52-.2L.2 6.2a.51.51 0 0 1-.16-.24.92.92 0 0 1 0-.57.66.66 0 0 1 .16-.24L5.16.2c.13-.14.3-.2.52-.2.21 0 .39.06.53.2Z"fill=#1d1d1d /></svg></div>
                <div class="swiper"><div class="swiper-wrapper"></div></div>
                <div class=swiper_color-next><svg fill=none height=12 viewBox="0 0 12 12"width=12 xmlns=http://www.w3.org/2000/svg><path d="M5.47 11.16a.75.75 0 0 1-.21-.53c0-.21.06-.39.2-.52l3.67-3.68H.75a.73.73 0 0 1-.53-.21.73.73 0 0 1-.22-.54c0-.21.07-.39.22-.53a.73.73 0 0 1 .53-.22h8.38L5.46 1.26a.68.68 0 0 1-.2-.53A.71.71 0 0 1 6 0c.21 0 .39.07.53.2l4.94 4.96c.08.06.13.14.16.23a.92.92 0 0 1 0 .57.66.66 0 0 1-.16.25l-4.95 4.95a.71.71 0 0 1-.52.2.71.71 0 0 1-.53-.2Z"fill=#1d1d1d /></svg></div>`;

                size > 4 ? (parent.innerHTML = swiperTemplate) : (parent.innerHTML = '');
            }

            function handleBuy(e) {
                e.preventDefault();
                const { currentTarget: btn } = e,
                    variantId = btn.dataset.varId ?? false,
                    parent = btn.closest('.product-actions'),
                    productId = btn.dataset.id ?? false,
                    quantity = +parent.querySelector('input[type="number"]').value;

                if (!variantId) {
                    popupMessage(parent, 'Selecione uma varia\u00e7\u00e3o!');
                    return null;
                }

                quickBuyAddToCart(productId, quantity, variantId, parent);
            }

            function popupMessage(target, message, time = 2000) {
                const alreadyElem = target.querySelector('.product-actions__message') ?? false;

                if (alreadyElem) return null;

                const nodeEl = document.createElement('P');

                nodeEl.classList.add('product-actions__message');

                nodeEl.innerHTML = message.toString();

                target.appendChild(nodeEl);

                setTimeout(() => {
                    target.removeChild(nodeEl);
                }, time);
            }

            async function quickBuyAddToCart(product_id, quant = 1, variant_id = 0, target) {
                const session_id = document.querySelector('html').dataset.session,
                    quantity = quant.toString(),
                    payload = { Cart: { session_id, product_id, quantity, variant_id } };

                try {
                    const response = await fetch('/web_api/cart/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json; charset=utf-8',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        body: JSON.stringify(payload),
                    });

                    const data = await response.json();

                    if (!response.ok) throw data;

                    theme.minicart().cart.updateCart();
                    theme.minicart().cart.minicartShow();
                } catch ({ code, causes }) {
                    code === 400 && popupMessage(target, causes[0]);
                    code >= 500 && popupMessage(target, 'Error no Servidor');
                    console.error('[code]', code, '[causes]', causes ? causes[0] : causes);
                }
            }

            function initColorSlider(target) {
                new Swiper(target.querySelector('.swiper'), {
                    slidesPerView: 4,
                    navigation: {
                        prevEl: target.querySelector('.swiper_color-prev'),
                        nextEl: target.querySelector('.swiper_color-next'),
                    },
                });
            }
        },

        variationShowcase: function () {

            function renderVariation(variations, target) {
                variations.map(({ name, id, stock, url }) => {
                    var renderVariation = renderByVariationType(name.split(' + ')[1], id, url, target.hasImage);
                    +stock > 0 && target.element.append(renderVariation);
                });
            }

            function renderByVariationType(name, id, url = '', type) {
                if (!type) {
                    return `<li class="product-variations-fake-option" data-value="${name}" data-id="${id}">${name}</li>`;
                }

                return `<li class="product-variations-colors-picture" data-value="${name}" data-id="${id}"><img class="product-variations-colors-img" src="${url}"></li>`;
            }

            function findVariation(val, json) {
                var teste = json.filter((e) => e.name.indexOf('+') !== -1 && e.name.split(' + ')[0] === val.toString());
                return json.filter((e) => e.name.indexOf('+') !== -1 && e.name.split(' + ')[0] === val.toString());
            }

            function setVariation(target, id) {
                target
                    .closest('.containerVariants')
                    .siblings('.product__buttons')
                    .find("button[type='submit']")
                    .attr('data-variant', id);
            }
        },


        closedPopupRetencao: function () {
            $('.closed-icon svg').mouseenter(function () {
                $('.cupom-code').css('color', 'red');
            });

            $('.closed-icon svg').mouseleave(function () {
                $('.cupom-code').css('color', 'var(--c_retencao_text)');
            });
        },
        whatsappHandler: function () {
            'use strict';

            const wp = document.querySelector('svg.whatsapp._tray'),
                wpBtn = document.querySelector('.float-buttons__btn--whatsapp'),
                trayWp = document.querySelectorAll('[tray-wp]');

            if (!wp) {
                trayWp.forEach((item) => item.parentElement.remove());
                wpBtn.closest('.float-buttons').classList.add('side-r');
                wpBtn.remove();
                return null;
            }

            const side = wp.getBoundingClientRect().x > window.innerWidth / 2 ? 'side-r' : 'side-l',
                wpHref = wp.closest('a').href,
                onlyNum = wpHref.replace(/\D/g, ''),
                noDDI = onlyNum.slice(2),
                dd = noDDI.slice(0, 2),
                tel = noDDI.slice(2),
                numStyle =
                    tel.length > 8
                        ? `${tel[0]} ${tel.slice(1, 5)}-${tel.slice(5)}`
                        : `${tel.slice(0, 4)}-${tel.slice(4)}`,
                numText = `(${dd}) ${numStyle}`; 

            trayWp.forEach((item) => {
                item.insertAdjacentText('beforeend', numText);
                item.href = wpHref;
                item.removeAttribute('tray-wp');
            });

            wpBtn.closest('.float-buttons').classList.add(side);
            wpBtn.href = wpHref;
            wp.closest('div').remove();
        },

        popupsBySession: function () {
            'use strict';

            const lightboxPopup = document.querySelector('.popup-up-main'),
                retentionPopup = document.querySelector('.content-popup-retencao');

            if (!lightboxPopup && !retentionPopup) return null;

            if (
                Boolean(
                    /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                        navigator.userAgent ||
                            typeof window.orientation !== 'undefined' ||
                            (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
                    )
                ) ||
                window.innerWidth < 992
            ) {
                lightboxPopup && lightboxPopup.remove();
                retentionPopup && retentionPopup.remove();
                return null;
            }

            retentionPopup && document.addEventListener('mouseleave', showPopupRetention);

            function showPopupRetention() {
                if (Boolean(window.sessionStorage.getItem('_popupRetention'))) {
                    retentionPopup.remove();
                    document.removeEventListener('mouseleave', showPopupRetention);
                    return null;
                }

                if (document.querySelector('.popup-up-main')) return null;

                document.querySelector('html').classList.add('_popup-ret');

                retentionPopup.querySelector('[data-popup-close]').addEventListener('click', () => {
                    window.sessionStorage.setItem('_popupRetention', 1);
                    retentionPopup.remove();
                    document.removeEventListener('mouseleave', showPopupRetention);
                    document.querySelector('html').classList.remove('_popup-ret');
                    return null;
                });
            }

            function lightboxInit() {
                if (Boolean(window.sessionStorage.getItem('_popupLightbox'))) {
                    lightboxPopup.remove();
                    return null;
                }

                document.querySelector('html').classList.add('_popup-lig');

                lightboxPopup.querySelector('[data-popup-close]').addEventListener('click', () => {
                    window.sessionStorage.setItem('_popupLightbox', 1);
                    lightboxPopup.remove();
                    document.querySelector('html').classList.remove('_popup-lig');
                    return null;
                });

                lightboxPopup.querySelector('form').addEventListener('submit', (e) => {
                    window.sessionStorage.setItem('_popupLightbox', 1);
                    lightboxPopup.remove();
                    document.querySelector('html').classList.remove('_popup-lig');
                    return null;
                });
            }

            lightboxPopup && lightboxInit();

        },
        slideRelated: function () {
            'use strict';

            const elem = document.querySelector('[data-slides="product-related"]');

            if (!elem) return null;

            new Swiper(elem.querySelector('.swiper'), {
                loop: false,
                slidesPerView: 1.4,
                spaceBetween: 6,
                lazy: {
                    loadPrevNext: true,
                },
                navigation: {
                    prevEl: elem.querySelector('.swiper_showcase-btn--prev'),
                    nextEl: elem.querySelector('.swiper_showcase-btn--next'),
                },
                breakpoints: {
                    540: {
                        slidesPerView: 2,
                    },
                    735: {
                        slidesPerView: 3,
                    },
                    992: {
                        slidesPerView: 4,
                    },
                },
                on: {
                    init: function (swiper) {
                        const currentSlidesPerView =
                                swiper.currentBreakpoint === 'max'
                                    ? swiper.passedParams.slidesPerView
                                    : swiper.passedParams.breakpoints[swiper.currentBreakpoint].slidesPerView,
                            totalSlides = swiper.slides.length;

                        totalSlides > currentSlidesPerView
                            ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                            : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');

                        elem.classList.add('show');
                    },

                    beforeResize: function (swiper) {
                        const currentSlidesPerView =
                                swiper.currentBreakpoint === 'max'
                                    ? swiper.passedParams.slidesPerView
                                    : swiper.passedParams.breakpoints[swiper.currentBreakpoint].slidesPerView,
                            totalSlides = swiper.slides.length;

                        totalSlides > currentSlidesPerView
                            ? swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.removeClass('jcc')
                            : !swiper.$wrapperEl.hasClass('jcc') && swiper.$wrapperEl.addClass('jcc');
                    },
                },
            });
        },
        organizeComparePage: function () {
            'use strict';

            const images = document.querySelectorAll('.page-comparador .comparator img');

            if (!images[0]) return null;

            const attrs = document.getElementById('_img-attr');

            images.forEach((img) => {
                const divWrapper = document.createElement('DIV'),
                    spanTitle = document.createElement('SPAN'),
                    imgParent = img.parentElement,
                    text = imgParent.text.trim();

                spanTitle.innerHTML = text;
                spanTitle.classList.add('_title');

                img.src = img.src.replace('/90_', '/');
                img.width = attrs.getAttribute('width');
                img.height = attrs.getAttribute('height');

                divWrapper.classList.add(attrs.getAttribute('shape'));
                divWrapper.insertAdjacentElement('afterbegin', img);

                imgParent.innerHTML = '';
                imgParent.insertAdjacentElement('afterbegin', spanTitle);
                imgParent.insertAdjacentElement('afterbegin', divWrapper);
            });
        },
        logginActions: async function () {
            'use strict';

            function removeElements(logged) {
                const items = document.querySelectorAll('[data-logged-user]');

                items.forEach((item) => {
                    const dataset = item.dataset.loggedUser;
                    logged ? dataset === 'false' && item.remove() : dataset === 'true' && item.remove();
                });
            }

            try {
                const response = await fetch('/mvc/store/greeting', {
                    method: 'GET',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                });

                if (!response.ok) {
                    throw response;
                }

                const {
                    data: { id },
                } = await response.json();

                removeElements(id);
            } catch ({ status, statusText }) {
                console.error('[Error]:', status, ' - ', statusText);
            }
        },
    };

    // Execution of Functions
    $(() => {
        const lazyLoadImages = new LazyLoad({
            elements_selector: '.lazyload',
        });
        theme.logginActions();
        theme.organizePagesTray();
        theme.minicart();
        theme.variationShowcase();
        theme.variantsSwipper();
        theme.variationOpenScope();
        theme.variationOpenScopeKit();
        theme.variationOpenScopeMulti();
        theme.testandofuncao();
        theme.noticeSlide();
        theme.commentSlides();
        theme.bannersExtraSlides();
        theme.footerToggle();
        theme.backToTop();
        theme.advantageSlidesHeader();
        theme.productMenuImage();
        theme.productSpotQuickBuy();
        theme.popupsBySession();
        theme.advantageSlides();

        setTimeout(() => {
            theme.processRteVideoAndTable();
            theme.menuProducts();
            theme.dropdownTrack();
            theme.mainMenuMobile();
            theme.libMaskInit();
            theme.productCountdown();
            theme.searchInput();
            theme.opensearch();
            theme.openApplyOverlayClose();
            theme.whatsappHandler();
        }, 20);

        if ($('html').hasClass('ls-theme-blue')) {
            setTimeout(function () {
                theme.configScroll();
            }, 40);
        }
        if ($('html').hasClass('page-home')) {
            setTimeout(function () {
                theme.closedPopupRetencao();
                theme.productSlides();
                theme.productPromoSlides();
                theme.advantageSlidesHeader();
                theme.bannerCenterMobile();
                theme.noticesData();
                theme.bannerSlides();
                theme.loadNewsPageOnHome();
                theme.startCountdown();
            }, 40);
            theme.noticeSlides();
            theme.customerReviewsSlidesOnHome();
            theme.brandsSlides();
        } else if ($('html').hasClass('page-product')) {
            theme.getQuantityChangeOnProductPage();
            theme.autoPlay();
            theme.gallerySlidesOnProductPage();
            theme.toggleProductVideoModal();
            theme.bodyMeasurement();
            theme.variantImagesUpdate();
            theme.arrowsHide();
            theme.generateShippingToProduct();
            theme.goToProductReviews();
            theme.reviewsOnProductPage();
            theme.tabNavigationOnProductPage();
            theme.buyTogetherOnProductPage();
            theme.customizationProductPage();
            theme.fixSubmitComment();
            theme.organizeProductPage();
            theme.productReview();
            theme.slideRelated();

            setTimeout(() => {
                lazyLoadImages;
            }, 20);
            setTimeout(() => {
                theme.closeSelectorBoxProductPage();
            }, 2000);
        } else if ($('html').hasClass('page-catalog')) {
            theme.pricefilter();
            theme.bannerSlides();
            theme.toggleSmartFilter();
            theme.removeFilter();
            theme.seeDesc();
        } else if ($('html').hasClass('page-search')) {
            theme.toggleSmartFilter();
            theme.pricefilter();
            theme.removeFilter();
        } else if ($('html').hasClass('page-contact')) {
            theme.organizeContactUsPage();
            theme.validateFormFieldsToSendContactEmail();
        } else if ($('html').hasClass('page-newsletter')) {
            theme.organizeNewsletterRegistrationPage();
        } else if ($('html').hasClass('page-depoimentos')) {
            theme.toggleShowReviewsForm();
            theme.validateFormFieldsToSendCustomerReview();
        } else if ($('html').hasClass('page-busca_noticias')) {
            theme.imgNewsDefault();
            theme.organizeNewsPage();
            theme.insertBreadcrumbNavigationInPage('listNews');
            theme.newsPageBtn();
        } else if ($('html').hasClass('page-noticia')) {
            theme.insertBreadcrumbNavigationInPage('news');
        } else if ($('html').hasClass('page-company')) {
            theme.insertBreadcrumbNavigationInPage('Sobre n&#243;s', true);
        } else if (
            $('html').hasClass('page-listas_index') ||
            $('html').hasClass('page-listas_evento') ||
            $('html').hasClass('page-listas_criar')
        ) {
            theme.insertBreadcrumbNavigationInPage('wishlist');
        } else if ($('html').hasClass('page-extra')) {
            theme.insertBreadcrumbNavigationInPage('Sistema de Afiliados', true);
        } else if ($('html').hasClass('page-comparador')) {
            theme.organizeComparePage();
        }
    });

    (function () {
        const isMobile = Boolean(
            /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent ||
                    typeof window.orientation !== 'undefined' ||
                    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
            )
        );

        isMobile
            ? document.querySelectorAll('._desktop').forEach((item) => item.remove())
            : document.querySelectorAll('._mobile').forEach((item) => item.remove());
    })();

    function checkCookie() {
        $('.cookies-container').show();

        if (window.localStorage.getItem('cookieLawKeyMiWeb')) {
            $('.cookies-container').hide();
        }
        $('.button-popup').on('click', function () {
            window.localStorage.setItem('cookieLawKeyMiWeb', true);
            $('.cookies-container ').hide({ expires: 1 });
        });
    }
    checkCookie();

    var prevScroll = window.pageYOffset;
    $(window).on('scroll', function scrollIntoView() {
        var currentScroll = window.pageYOffset;

        if (prevScroll > currentScroll) {
            $('.header-content').attr('searchHidden', false);
            $('.header-search').attr('searchHidden', false);
            $('.header-topbar').attr('data-scroll', false);
        } else {
            if (currentScroll > 150) {
                $('.header-content').attr('searchHidden', true);
                $('.header-search').attr('searchHidden', true);
            }
            if (currentScroll > 43) {
                $('.header-topbar').attr('data-scroll', true);
            }
        }

        prevScroll = currentScroll;
    });


    $('.product').each(function () {
        let quantityAll = $(this).find('.product-info .product-price .product__buttons .buttons__quantity');
        let inputQuantity = quantityAll.find('#quant');
        let plus = quantityAll.find('.buttons__amount #plus');
        let minus = quantityAll.find('.buttons__amount #minus');

        plus.on('click', function () {
            let currentQuantity = parseInt(inputQuantity.val());
            let newQuantity = currentQuantity + 1;
            inputQuantity.val(newQuantity);
        });

        minus.on('click', function () {
            let currentQuantity = parseInt(inputQuantity.val());
            let newQuantity = Math.max(currentQuantity - 1, 0); 
            inputQuantity.val(newQuantity);
        });
    });

    if ($('.default-main .pop-up-img').length > 0) {
        return null;
        
    } else if ($('.default-main .pop-up').length > 0) {
        setTimeout(function () {
            if (!sessionStorage.getItem('showpopup')) {
                $('body').addClass('overlay');
                $('.pop-up').css('display', 'flex');

                $('form.text__form').on('submit', function () {
                    sessionStorage.setItem('showpopup', 'true');
                });

                $('.pop-up__close, #overlay').on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $('.pop-up').remove();

                    $('body').removeClass('overlay');

                    sessionStorage.setItem('showpopup', 'true');
                });
            } else {
                $('.pop-up').remove();
            }
        }, 8000);
    }

    setTimeout(function () {
        jQuery('.header-advantage-container').css('display', 'flex');
    }, 2000);

    jQuery(document).ready(function () {
        jQuery('._lazy').removeClass();
    });

    function listenerAjaxRequest(path, cb) {
        jQuery(document).on('ajaxComplete', function (event, req, settings) {
            if (settings.url.indexOf(path.toString()) != -1) {
                return cb();
            }
        });
    }
})(jQuery);
