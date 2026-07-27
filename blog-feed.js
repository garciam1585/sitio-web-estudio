document.addEventListener("DOMContentLoaded", () => {

    const container = document.getElementById("blog-posts");

    if (!container) return;

    const label = container.dataset.label;
    const title = container.dataset.title || "También puede interesarle";

    // Estado de carga
    container.innerHTML = `
        <h2 class="related-title">${title}</h2>
        <p style="text-align:center;padding:30px 0;">Cargando artículos...</p>
    `;

    // Nombre único para el callback
    const callbackName = "mostrarPosts_" + Date.now();

    window[callbackName] = function (data) {

        try {

            if (!data.feed || !data.feed.entry) {
                container.innerHTML = "";
                return;
            }

            let html = `
                <h2 class="related-title">${title}</h2>
                <div class="related-grid">
            `;

            data.feed.entry.slice(0, 3).forEach(post => {

                const alternate = post.link.find(l => l.rel === "alternate");
                const enlace = alternate ? alternate.href : "#";

                const titulo = post.title.$t;

                const fecha = new Date(post.published.$t).toLocaleDateString(
                    "es-AR",
                    {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );

                const resumen = post.summary
                    ? post.summary.$t
                        .replace(/<[^>]*>/g, "")
                        .substring(0, 140)
                        .trim() + "..."
                    : "";

                // Imagen
                let imagen = "images/blog-default.webp";

                if (post.content && post.content.$t) {

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(post.content.$t, "text/html");

                    const img = doc.querySelector("img");

                    if (img) {

                        imagen = img.src
                            // Imagen original
                            .replace(/\/s[^/]+\//, "/s0/")
                            // Compatibilidad con URLs antiguas
                            .replace(/=s\d+(-c)?$/, "=s0");

                    }

                }

                html += `
                    <article class="related-card">

                        <img
                            src="${imagen}"
                            alt="${titulo}"
                            loading="lazy"
                            decoding="async"
                        >

                        <div class="related-content">

                            <span class="related-date">${fecha}</span>

                            <h3>${titulo}</h3>

                            <p>${resumen}</p>

                            <a
                                href="${enlace}"
                                class="related-button"
                                target="_blank"
                                rel="noopener"
                            >
                                Leer artículo →
                            </a>

                        </div>

                    </article>
                `;

            });

            html += "</div>";

            container.innerHTML = html;

        } catch (e) {

            console.error(e);

            container.innerHTML = "";

        }

        // Limpieza
        script.remove();
        delete window[callbackName];

    };

    const script = document.createElement("script");

    script.src =
        `https://blog.mgabogado.com.ar/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json-in-script&callback=${callbackName}`;

    script.onerror = () => {

        container.innerHTML = "";

        script.remove();

        delete window[callbackName];

    };

    document.body.appendChild(script);

});
