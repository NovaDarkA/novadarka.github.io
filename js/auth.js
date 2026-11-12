/* Sección 9: validación de los formularios Login y Sign Up.
   IMPORTANTE: este sitio es estático (GitHub Pages) y NO tiene backend. Por eso este script solo
   valida los campos en el navegador. No envía datos a ningún servidor, no crea cuentas, no inicia
   sesión, no guarda contraseñas ni correos (ni en localStorage ni en cookies) y no simula que
   la autenticación funciona. Para activarla hace falta un servicio de autenticación externo
   (ver la nota de entrega del proyecto). */
(function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var MESSAGES = {
    emailEmpty: "Enter your email address.",
    emailInvalid: "Enter a valid email address, like name@example.com.",
    passwordEmpty: "Enter your password.",
    newPasswordEmpty: "Create a password.",
    newPasswordShort: "Use at least 8 characters.",
    confirmEmpty: "Confirm your password.",
    confirmMismatch: "Passwords do not match.",
    formInvalid: "Please fix the errors above and try again.",
    loginUnavailable: "Your details look valid, but login is not available yet: this site has no server to check accounts. Nothing was sent or saved.",
    registerUnavailable: "Your details look valid, but sign up is not available yet: this site has no server to create accounts. Nothing was sent or saved."
  };

  /* Devuelve el texto del error de un campo o "" si es válido. */
  function check(input) {
    var rule = input.dataset.rule;
    var value = input.value;
    if (rule === "email") {
      value = value.trim();
      if (!value) return MESSAGES.emailEmpty;
      if (!EMAIL_RE.test(value)) return MESSAGES.emailInvalid;
    } else if (rule === "password") {
      if (!value) return MESSAGES.passwordEmpty;
    } else if (rule === "new-password") {
      if (!value) return MESSAGES.newPasswordEmpty;
      if (value.length < 8) return MESSAGES.newPasswordShort;
    } else if (rule === "confirm") {
      var other = document.getElementById(input.dataset.match);
      if (!value) return MESSAGES.confirmEmpty;
      if (other && value !== other.value) return MESSAGES.confirmMismatch;
    }
    return "";
  }

  function errorBox(input) {
    return document.getElementById(input.id + "-error") ||
      document.getElementById(input.getAttribute("aria-describedby").split(" ").pop());
  }

  function show(input, message) {
    var box = errorBox(input);
    if (box) box.textContent = message;
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function setup(form) {
    var kind = form.dataset.authForm;
    var fields = Array.prototype.slice.call(form.querySelectorAll("[data-rule]"));
    var status = form.querySelector(".auth-status");

    function say(message, isError) {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle("is-error", !!isError);
    }

    fields.forEach(function (input) {
      // Al salir del campo se valida; mientras se corrige, el error se actualiza al momento.
      input.addEventListener("blur", function () {
        if (input.value !== "" || input.hasAttribute("aria-invalid")) show(input, check(input));
      });
      input.addEventListener("input", function () {
        say("", false);
        if (input.hasAttribute("aria-invalid")) show(input, check(input));
        // Si cambia la contraseña, vuelve a comprobar la confirmación ya marcada.
        if (input.dataset.rule === "new-password") {
          fields.forEach(function (other) {
            if (other.dataset.rule === "confirm" && other.value !== "") show(other, check(other));
          });
        }
      });
    });

    form.addEventListener("submit", function (event) {
      // Siempre se evita el envío real: no existe un servidor que lo reciba.
      event.preventDefault();
      var firstInvalid = null;
      fields.forEach(function (input) {
        var message = check(input);
        show(input, message);
        if (message && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        say(MESSAGES.formInvalid, true);
        firstInvalid.focus();
        return;
      }
      say(kind === "register" ? MESSAGES.registerUnavailable : MESSAGES.loginUnavailable, false);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-auth-form]"), setup);
})();
