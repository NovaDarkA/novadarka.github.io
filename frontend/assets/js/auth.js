
(function () {
  "use strict";

  var EMAIL_RE = /^[^\s@.]+(?:\.[^\s@.]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

  var MESSAGES = {
    emailEmpty: "Introduce tu correo electrónico.",
    emailInvalid: "Introduce un correo válido, por ejemplo nombre@ejemplo.com.",
    passwordEmpty: "Introduce tu contraseña.",
    newPasswordEmpty: "Crea una contraseña.",
    newPasswordShort: "Usa al menos 8 caracteres.",
    confirmEmpty: "Confirma tu contraseña.",
    confirmMismatch: "Las contraseñas no coinciden.",
    formInvalid: "Corrige los errores e inténtalo nuevamente.",
    loginUnavailable: "No se pudo iniciar sesión.",
    registerUnavailable: "No se pudo crear la cuenta."
  };

  
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
      input.addEventListener("blur", function () {
        if (input.value !== "" || input.hasAttribute("aria-invalid")) show(input, check(input));
      });
      input.addEventListener("input", function () {
        say("", false);
        if (input.hasAttribute("aria-invalid")) show(input, check(input));
        if (input.dataset.rule === "new-password") {
          fields.forEach(function (other) {
            if (other.dataset.rule === "confirm" && other.value !== "") show(other, check(other));
          });
        }
      });
    });

    form.addEventListener("submit", async function (event) {
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
      var button=form.querySelector('button[type="submit"]');
      if(button.disabled)return;
      var originalLabel=button.textContent;
      button.disabled=true;
      button.textContent=kind==='register'?'Creando cuenta…':'Iniciando sesión…';
      form.setAttribute('aria-busy','true');
      try {
        var response=await fetch(kind==="register"?"/api/register":"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.elements.email.value,password:form.elements.password.value})});
        var data=await response.json();
        if(!response.ok){say(data.error==="invalid_email"?"Introduce un correo válido, por ejemplo nombre@gmail.com.":data.error==="registration_unavailable"?"No se pudo crear la cuenta. Comprueba el correo e inténtalo más tarde.":response.status===401?"Correo o contraseña incorrectos.":response.status===429?"Demasiados intentos. Intenta más tarde.":"No se pudo completar la operación.",true);return;}
        if(kind==="register"){form.reset();if(data.status==="account_created"){say("Cuenta creada correctamente. Ya puedes iniciar sesión.",false);location.assign("/login");}else say("Revisa tu correo para confirmar tu cuenta.",false);}
        else if(["/administracion","/panel-empleado","/cuenta"].includes(data.redirect)){location.assign(data.redirect);}
        else say("No se pudo iniciar sesión.",true);
      }catch{say("No se pudo conectar con el servicio.",true);}
      finally{button.disabled=false;button.textContent=originalLabel;form.removeAttribute("aria-busy");}
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-auth-form]"), setup);
})();
