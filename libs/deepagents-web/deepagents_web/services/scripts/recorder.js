(function () {
    var RECORDER_VERSION = "2026-01-15.1";
    if (window.__deepagentsRecorder__ && window.__deepagentsRecorderVersion__ === RECORDER_VERSION) {
        return;
    }
    window.__deepagentsRecorder__ = true;
    window.__deepagentsRecorderVersion__ = RECORDER_VERSION;

    var ACTIONS_KEY = "__deepagents_actions__";
    window.__recordedActions__ = window.__recordedActions__ || [];
    window.__extractMode__ = false;
    window.__aiExtractMode__ = false;
    window.__aiFormFillMode__ = false;
    window.__highlightOverlay__ = null;
    window.__recorderPanel__ = null;
    window.__inputTimers__ = window.__inputTimers__ || {};
    window.__lastInputValues__ = window.__lastInputValues__ || {};

    function safeText(text, maxLen) {
        if (!text) {
            return "";
        }
        var cleaned = String(text).replace(/\s+/g, " ").trim();
        if (maxLen && cleaned.length > maxLen) {
            return cleaned.slice(0, maxLen) + "...";
        }
        return cleaned;
    }

    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text || "";
        return div.innerHTML;
    }

    function saveActions() {
        try {
            sessionStorage.setItem(ACTIONS_KEY, JSON.stringify(window.__recordedActions__));
        } catch (e) {
            console.warn("[DeepAgents] Failed to save actions", e);
        }
    }

    function loadActions() {
        try {
            var saved = sessionStorage.getItem(ACTIONS_KEY);
            if (saved) {
                var parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    window.__recordedActions__ = parsed;
                }
            }
        } catch (e) {
            console.warn("[DeepAgents] Failed to load actions", e);
        }
    }

    function updateActionCount() {
        var countEl = document.getElementById("__deepagents_action_count__");
        if (countEl) {
            countEl.textContent = window.__recordedActions__.length + " actions";
        }
    }

    function showStatus(text) {
        var statusEl = document.getElementById("__deepagents_status__");
        if (!statusEl) {
            return;
        }
        if (text) {
            statusEl.textContent = text;
            statusEl.style.display = "block";
        } else {
            statusEl.textContent = "";
            statusEl.style.display = "none";
        }
    }

    function showPreview(action) {
        if (!document.body) {
            return;
        }
        var modal = document.getElementById("__deepagents_preview_modal__");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "__deepagents_preview_modal__";
            modal.style.cssText =
                "position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:2147483647;display:flex;" +
                "align-items:center;justify-content:center;";
            modal.innerHTML =
                '<div style="background:#fff;border-radius:10px;max-width:640px;width:90%;padding:16px;' +
                'box-shadow:0 8px 30px rgba(0,0,0,0.2);font-family:Arial,sans-serif;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
                "<strong>Action Preview</strong>" +
                '<button id="__deepagents_preview_close__" style="border:none;background:none;font-size:18px;cursor:pointer;">&times;</button>' +
                "</div>" +
                '<pre id="__deepagents_preview_body__" style="white-space:pre-wrap;font-size:12px;max-height:320px;overflow:auto;"></pre>' +
                "</div>";
            document.body.appendChild(modal);
            modal.addEventListener("click", function (e) {
                if (e.target === modal) {
                    modal.style.display = "none";
                }
            });
            modal.querySelector("#__deepagents_preview_close__").addEventListener("click", function () {
                modal.style.display = "none";
            });
        }
        var body = modal.querySelector("#__deepagents_preview_body__");
        if (body) {
            body.textContent = JSON.stringify(action, null, 2);
        }
        modal.style.display = "flex";
    }

    function updateActionList() {
        var listEl = document.getElementById("__deepagents_action_list__");
        var emptyEl = document.getElementById("__deepagents_empty_state__");
        if (!listEl) {
            return;
        }
        listEl.innerHTML = "";
        if (!window.__recordedActions__.length) {
            if (emptyEl) {
                emptyEl.style.display = "block";
            }
        } else if (emptyEl) {
            emptyEl.style.display = "none";
        }

        window.__recordedActions__.forEach(function (action, index) {
            var item = document.createElement("div");
            item.style.cssText =
                "display:flex;align-items:flex-start;gap:8px;padding:8px 6px;border-bottom:1px solid rgba(0,0,0,0.05);";
            var summary = formatActionSummary(action);
            item.innerHTML =
                '<div style="font-size:11px;color:#64748b;width:52px;">' +
                new Date(action.timestamp || Date.now()).toLocaleTimeString() +
                "</div>" +
                '<div style="flex:1;font-size:12px;color:#0f172a;line-height:1.4;">' +
                escapeHtml(summary) +
                "</div>" +
                '<div style="display:flex;gap:6px;">' +
                '<button data-action="preview" data-index="' +
                index +
                '" style="border:1px solid #cbd5f5;background:#fff;border-radius:6px;font-size:11px;padding:2px 6px;cursor:pointer;">Preview</button>' +
                '<button data-action="delete" data-index="' +
                index +
                '" style="border:1px solid #fecaca;background:#fff;border-radius:6px;font-size:11px;padding:2px 6px;cursor:pointer;color:#b91c1c;">Delete</button>' +
                "</div>";
            listEl.appendChild(item);
        });

        listEl.querySelectorAll("button").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                var index = parseInt(btn.getAttribute("data-index"), 10);
                if (Number.isNaN(index)) {
                    return;
                }
                var actionName = btn.getAttribute("data-action");
                if (actionName === "delete") {
                    window.__recordedActions__.splice(index, 1);
                    saveActions();
                    updateActionCount();
                    updateActionList();
                } else if (actionName === "preview") {
                    showPreview(window.__recordedActions__[index]);
                }
            });
        });
    }

    function formatActionSummary(action) {
        var type = action.type || "action";
        if (type === "execute_js") {
            return "execute_js -> " + (action.variable_name || "result");
        }
        if (type === "extract_text" || type === "extract_html" || type === "extract_attribute") {
            var target = action.selector || action.xpath || "";
            var variable = action.variable_name || action.output_key || "variable";
            if (type === "extract_attribute") {
                var attr = action.attribute_name || "attribute";
                return "extract_attribute " + attr + " from " + target + " -> " + variable;
            }
            return type + " " + target + " -> " + variable;
        }
        var selector = action.selector || action.xpath || "";
        var value = action.value ? " = " + safeText(action.value, 40) : "";
        return type + " " + selector + value;
    }

    function createRecorderUI() {
        if (window.__recorderPanel__) {
            return;
        }

        if (!document.body) {
            // In rare cases (about:blank or very early injection) the body is not yet available.
            document.addEventListener(
                "DOMContentLoaded",
                function () {
                    createRecorderUI();
                },
                { once: true },
            );
            return;
        }

        var panel = document.createElement("div");
        panel.id = "__deepagents_recorder_panel__";
        panel.style.cssText =
            "position:fixed;top:20px;right:20px;z-index:2147483646;width:360px;background:#ffffff;" +
            "border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,0.15);border:1px solid rgba(0,0,0,0.08);" +
            "font-family:Arial,sans-serif;color:#0f172a;overflow:hidden;";

        var header = document.createElement("div");
        header.style.cssText =
            "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:move;" +
            "border-bottom:1px solid rgba(0,0,0,0.06);";
        header.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.5);"></div>' +
            "<strong>Recording</strong>" +
            "</div>" +
            '<div id="__deepagents_action_count__" style="font-size:11px;color:#64748b;">0 actions</div>';

        var buttonRow = document.createElement("div");
        buttonRow.style.cssText = "display:flex;gap:8px;padding:10px 16px;flex-wrap:wrap;";
        buttonRow.innerHTML =
            '<button id="__deepagents_extract_btn__" style="flex:1;border:1px solid #cbd5f5;background:#fff;border-radius:8px;padding:6px 8px;font-size:12px;cursor:pointer;">Data Extract</button>' +
            '<button id="__deepagents_ai_extract_btn__" style="flex:1;border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:8px;padding:6px 8px;font-size:12px;cursor:pointer;">AI Extract</button>' +
            '<button id="__deepagents_ai_form_btn__" style="flex:1;border:1px solid #475569;background:#475569;color:#fff;border-radius:8px;padding:6px 8px;font-size:12px;cursor:pointer;">AI Form Fill</button>';

        var extractTypeRow = document.createElement("div");
        extractTypeRow.style.cssText = "display:flex;gap:8px;padding:0 16px 10px 16px;align-items:center;";
        extractTypeRow.innerHTML =
            '<label style="font-size:11px;color:#64748b;">Extract type</label>' +
            '<select id="__deepagents_extract_type__" style="flex:1;border:1px solid #cbd5f5;border-radius:6px;padding:4px 6px;font-size:11px;">' +
            '<option value="text">Text</option>' +
            '<option value="html">HTML</option>' +
            '<option value="attribute">Attribute</option>' +
            "</select>";

        var listWrapper = document.createElement("div");
        listWrapper.style.cssText = "max-height:260px;overflow:auto;padding:0 16px 8px 16px;";
        listWrapper.innerHTML =
            '<div id="__deepagents_empty_state__" style="padding:16px 4px;color:#94a3b8;font-size:12px;">No actions yet.</div>' +
            '<div id="__deepagents_action_list__"></div>';

        var statusEl = document.createElement("div");
        statusEl.id = "__deepagents_status__";
        statusEl.style.cssText =
            "padding:8px 16px;border-top:1px solid rgba(0,0,0,0.06);font-size:11px;color:#64748b;display:none;";

        var stopRow = document.createElement("div");
        stopRow.style.cssText = "padding:10px 16px;border-top:1px solid rgba(0,0,0,0.06);";
        stopRow.innerHTML =
            '<button id="__deepagents_stop_btn__" style="width:100%;border:1px solid #fca5a5;background:#fef2f2;color:#b91c1c;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;">Stop Recording</button>';

        panel.appendChild(header);
        panel.appendChild(buttonRow);
        panel.appendChild(extractTypeRow);
        panel.appendChild(listWrapper);
        panel.appendChild(statusEl);
        panel.appendChild(stopRow);
        document.body.appendChild(panel);

        window.__recorderPanel__ = panel;

        makeDraggable(panel, header);
        wireButtons();
        updateActionCount();
        updateActionList();
    }

    function openPanelForm(options) {
        if (!document.body) {
            return null;
        }

        var existing = document.getElementById("__deepagents_panel_form__");
        if (existing) {
            existing.remove();
        }

        var overlay = document.createElement("div");
        overlay.id = "__deepagents_panel_form__";
        overlay.style.cssText =
            "position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:2147483647;display:flex;" +
            "align-items:center;justify-content:center;font-family:Arial,sans-serif;";

        var dialog = document.createElement("div");
        dialog.style.cssText =
            "background:#fff;border-radius:12px;min-width:320px;max-width:560px;width:92%;padding:14px 16px;" +
            "box-shadow:0 8px 30px rgba(0,0,0,0.25);";

        var header = document.createElement("div");
        header.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;";
        var title = document.createElement("strong");
        title.textContent = (options && options.title) || "Action";
        var closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.textContent = "×";
        closeBtn.style.cssText = "border:none;background:none;font-size:18px;cursor:pointer;";
        header.appendChild(title);
        header.appendChild(closeBtn);

        var body = document.createElement("div");
        body.style.cssText = "display:flex;flex-direction:column;gap:10px;";

        if (options && options.description) {
            var desc = document.createElement("div");
            desc.style.cssText = "font-size:12px;color:#334155;";
            desc.textContent = options.description;
            body.appendChild(desc);
        }

        var fields = (options && options.fields) || [];
        fields.forEach(function (field) {
            var label = document.createElement("label");
            label.style.cssText = "font-size:12px;color:#475569;";
            label.textContent = field.label || field.id;
            body.appendChild(label);

            var input;
            if (field.type === "textarea") {
                input = document.createElement("textarea");
                input.rows = field.rows || 4;
            } else {
                input = document.createElement("input");
                input.type = "text";
            }
            input.id = field.id;
            input.value = field.value || "";
            if (field.placeholder) {
                input.placeholder = field.placeholder;
            }
            input.style.cssText = "border:1px solid #cbd5f5;border-radius:8px;padding:6px 8px;font-size:12px;";
            body.appendChild(input);
        });

        var footer = document.createElement("div");
        footer.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:12px;";
        var cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.textContent = (options && options.cancelText) || "Cancel";
        cancelBtn.style.cssText = "border:1px solid #cbd5f5;background:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;";
        var okBtn = document.createElement("button");
        okBtn.type = "button";
        okBtn.textContent = (options && options.okText) || "OK";
        okBtn.style.cssText = "border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;";
        footer.appendChild(cancelBtn);
        footer.appendChild(okBtn);

        function close() {
            overlay.remove();
        }

        function collectValues() {
            var values = {};
            fields.forEach(function (field) {
                var el = overlay.querySelector("#" + field.id);
                values[field.id] = el ? String(el.value || "").trim() : "";
            });
            return values;
        }

        closeBtn.addEventListener("click", close);
        cancelBtn.addEventListener("click", close);
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) {
                close();
            }
        });
        okBtn.addEventListener("click", function () {
            try {
                if (options && typeof options.onOk === "function") {
                    options.onOk(collectValues());
                }
            } finally {
                close();
            }
        });

        dialog.appendChild(header);
        dialog.appendChild(body);
        dialog.appendChild(footer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        var firstField = fields[0];
        if (firstField) {
            var firstInput = overlay.querySelector("#" + firstField.id);
            if (firstInput && firstInput.focus) {
                firstInput.focus();
                if (firstInput.select) {
                    firstInput.select();
                }
            }
        }

        return overlay;
    }

    function makeDraggable(panel, handle) {
        var isDragging = false;
        var startX = 0;
        var startY = 0;
        var offsetX = 0;
        var offsetY = 0;

        handle.addEventListener("mousedown", function (e) {
            isDragging = true;
            startX = e.clientX - offsetX;
            startY = e.clientY - offsetY;
            panel.style.right = "auto";
            e.preventDefault();
        });

        document.addEventListener("mousemove", function (e) {
            if (!isDragging) {
                return;
            }
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            panel.style.transform = "translate(" + offsetX + "px, " + offsetY + "px)";
        });

        document.addEventListener("mouseup", function () {
            isDragging = false;
        });
    }

    function wireButtons() {
        if (!document.body) {
            return;
        }

        var extractBtn = document.getElementById("__deepagents_extract_btn__");
        var aiExtractBtn = document.getElementById("__deepagents_ai_extract_btn__");
        var aiFormBtn = document.getElementById("__deepagents_ai_form_btn__");
        var stopBtn = document.getElementById("__deepagents_stop_btn__");

        if (extractBtn) {
            extractBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                toggleMode("extract");
            });
        }
        if (aiExtractBtn) {
            aiExtractBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                toggleMode("aiExtract");
            });
        }
        if (aiFormBtn) {
            aiFormBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                toggleMode("aiFormFill");
            });
        }
        if (stopBtn) {
            stopBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                window.__stopRecordingRequest__ = true;
                showStatus("Stop requested. Return to the app to finalize.");
            });
        }
    }

    function toggleMode(mode) {
        window.__extractMode__ = mode === "extract" ? !window.__extractMode__ : false;
        window.__aiExtractMode__ = mode === "aiExtract" ? !window.__aiExtractMode__ : false;
        window.__aiFormFillMode__ = mode === "aiFormFill" ? !window.__aiFormFillMode__ : false;

        var extractBtn = document.getElementById("__deepagents_extract_btn__");
        var aiExtractBtn = document.getElementById("__deepagents_ai_extract_btn__");
        var aiFormBtn = document.getElementById("__deepagents_ai_form_btn__");

        if (extractBtn) {
            extractBtn.style.background = window.__extractMode__ ? "#e2e8f0" : "#fff";
        }
        if (aiExtractBtn) {
            aiExtractBtn.style.opacity = window.__aiExtractMode__ ? "0.85" : "1";
        }
        if (aiFormBtn) {
            aiFormBtn.style.opacity = window.__aiFormFillMode__ ? "0.85" : "1";
        }

        var anyActive = window.__extractMode__ || window.__aiExtractMode__ || window.__aiFormFillMode__;
        document.body.style.cursor = anyActive ? "crosshair" : "";
        if (anyActive) {
            showStatus("Select an element to record this action.");
        } else {
            showStatus("");
        }
    }

    function isRecorderElement(el) {
        if (!el || el.nodeType !== 1) {
            return false;
        }
        if (el.id && el.id.indexOf("__deepagents_") === 0) {
            return true;
        }
        if (typeof el.closest !== "function") {
            return false;
        }
        return Boolean(
            el.closest("#__deepagents_recorder_panel__") ||
                el.closest("#__deepagents_panel_form__") ||
                el.closest("#__deepagents_preview_modal__") ||
                el.closest("#__deepagents_loading__") ||
                el.closest("#__deepagents_highlight__")
        );
    }

    function highlightElement(el) {
        if (!el || !window.__highlightOverlay__) {
            return;
        }
        var rect = el.getBoundingClientRect();
        var highlight = window.__highlightOverlay__;
        highlight.style.display = "block";
        highlight.style.left = rect.left + window.scrollX - 2 + "px";
        highlight.style.top = rect.top + window.scrollY - 2 + "px";
        highlight.style.width = rect.width + 4 + "px";
        highlight.style.height = rect.height + 4 + "px";
    }

    function hideHighlight() {
        if (window.__highlightOverlay__) {
            window.__highlightOverlay__.style.display = "none";
        }
    }

    function buildHighlightOverlay() {
        var existing = document.getElementById("__deepagents_highlight__");
        if (existing) {
            window.__highlightOverlay__ = existing;
            return;
        }
        var highlight = document.createElement("div");
        highlight.id = "__deepagents_highlight__";
        highlight.style.cssText =
            "position:absolute;border:2px solid #3b82f6;border-radius:4px;z-index:2147483645;" +
            "pointer-events:none;display:none;box-shadow:0 0 0 1px rgba(59,130,246,0.15);";
        if (!document.body) {
            document.addEventListener(
                "DOMContentLoaded",
                function () {
                    if (document.body && !document.getElementById("__deepagents_highlight__")) {
                        document.body.appendChild(highlight);
                    }
                },
                { once: true },
            );
        } else {
            document.body.appendChild(highlight);
        }
        window.__highlightOverlay__ = highlight;
    }

    function getCssSelector(el) {
        if (!el || !el.tagName) {
            return "body";
        }
        if (el.id && !/^[0-9]/.test(el.id)) {
            return "#" + el.id;
        }
        var attributes = ["data-testid", "data-test", "data-qa"];
        for (var i = 0; i < attributes.length; i++) {
            var attr = el.getAttribute(attributes[i]);
            if (attr) {
                return el.tagName.toLowerCase() + "[" + attributes[i] + '="' + attr + '"]';
            }
        }
        if (el.name) {
            return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
        }
        if (el.getAttribute("aria-label")) {
            return el.tagName.toLowerCase() + '[aria-label="' + el.getAttribute("aria-label") + '"]';
        }
        if (el.placeholder) {
            return el.tagName.toLowerCase() + '[placeholder="' + el.placeholder + '"]';
        }

        var selector = el.tagName.toLowerCase();
        if (el.className && typeof el.className === "string") {
            var classes = el.className.trim().split(/\s+/);
            var stable = [];
            for (var c = 0; c < classes.length && stable.length < 2; c++) {
                var cls = classes[c];
                if (cls.length < 20 && !/[A-Z]{2,}/.test(cls) && !/[0-9]{4,}/.test(cls)) {
                    stable.push(cls);
                }
            }
            if (stable.length) {
                selector += "." + stable.join(".");
            }
        }

        if (el.parentElement) {
            var siblings = Array.prototype.filter.call(el.parentElement.children, function (child) {
                return child.tagName === el.tagName;
            });
            if (siblings.length > 1) {
                selector += ":nth-of-type(" + (siblings.indexOf(el) + 1) + ")";
            }
        }
        return selector;
    }

    function getXPath(el) {
        if (!el || el.nodeType !== 1) {
            return "//body";
        }
        if (el.id && !/^[0-9]/.test(el.id)) {
            return '//*[@id="' + el.id + '"]';
        }
        var path = "";
        var current = el;
        while (current && current.nodeType === 1) {
            var tag = current.tagName.toLowerCase();
            var index = 1;
            var sibling = current.previousSibling;
            while (sibling) {
                if (sibling.nodeType === 1 && sibling.tagName === current.tagName) {
                    index += 1;
                }
                sibling = sibling.previousSibling;
            }
            var segment = "/" + tag + (index > 1 ? "[" + index + "]" : "");
            path = segment + path;
            if (current.parentNode && current.parentNode.id && !/^[0-9]/.test(current.parentNode.id)) {
                path = '//*[@id="' + current.parentNode.id + '"]' + path;
                break;
            }
            current = current.parentNode;
        }
        return path || "//body";
    }

    function getSelectors(el) {
        return {
            css: getCssSelector(el),
            xpath: getXPath(el)
        };
    }

    function implicitRole(el) {
        if (!el || !el.tagName) {
            return "generic";
        }
        var tag = el.tagName.toLowerCase();
        var type = el.type ? el.type.toLowerCase() : "";
        if (tag === "button") return "button";
        if (tag === "a") return "link";
        if (tag === "input") {
            if (type === "search") return "searchbox";
            if (type === "checkbox") return "checkbox";
            if (type === "radio") return "radio";
            if (type === "submit" || type === "button") return "button";
            return "textbox";
        }
        if (tag === "textarea") return "textbox";
        if (tag === "select") return "combobox";
        if (tag === "img") return "img";
        if (tag === "nav") return "navigation";
        if (tag === "form") return "form";
        if (tag === "main") return "main";
        if (tag === "header") return "banner";
        if (tag === "footer") return "contentinfo";
        return "generic";
    }

    function getRole(el) {
        return el.getAttribute("role") || implicitRole(el);
    }

    function getLabelText(el) {
        if (!el || !el.id) {
            return "";
        }
        var label = document.querySelector('label[for="' + el.id + '"]');
        return label ? label.innerText.trim() : "";
    }

    function getAccessibleName(el) {
        if (!el) {
            return "";
        }
        var ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel) return ariaLabel.trim();
        var labelledBy = el.getAttribute("aria-labelledby");
        if (labelledBy) {
            var labelEl = document.getElementById(labelledBy);
            if (labelEl) return safeText(labelEl.innerText, 50);
        }
        var labelText = getLabelText(el);
        if (labelText) return safeText(labelText, 50);
        if (el.innerText) return safeText(el.innerText, 50);
        if (el.placeholder) return safeText(el.placeholder, 50);
        if (el.title) return safeText(el.title, 50);
        if (el.alt) return safeText(el.alt, 50);
        if (el.value && (el.tagName === "BUTTON" || el.tagName === "INPUT")) {
            return safeText(el.value, 50);
        }
        return "";
    }

    function inferVerb(eventType, el) {
        if (eventType === "click") return "click";
        if (eventType === "fill") return "input";
        if (eventType === "select") return "select";
        if (eventType === "extract") return "extract";
        if (eventType === "execute_js") return "execute";
        if (eventType === "scroll") return "scroll";
        if (eventType === "press") return "press";
        if (eventType === "hover") return "hover";
        if (eventType === "check") return "check";
        if (eventType === "uncheck") return "uncheck";
        return el ? el.tagName.toLowerCase() : "interact";
    }

    function inferObject(el) {
        if (!el) {
            return "element";
        }
        var name = getAccessibleName(el);
        if (name) return name;
        if (el.name) return el.name;
        if (el.id) return el.id;
        return el.tagName.toLowerCase();
    }

    function getNearbyText(el) {
        if (!el || !el.parentElement) {
            return [];
        }
        var texts = [];
        Array.prototype.forEach.call(el.parentElement.children, function (child) {
            if (child !== el && child.innerText) {
                var snippet = safeText(child.innerText, 50);
                if (snippet) {
                    texts.push(snippet);
                }
            }
        });
        return texts.slice(0, 5);
    }

    function getAncestorTags(el) {
        var tags = [];
        var current = el;
        while (current && current.tagName) {
            tags.push(current.tagName.toLowerCase());
            if (current.tagName.toLowerCase() === "body") {
                break;
            }
            current = current.parentElement;
        }
        return tags;
    }

    function getFormHint(el) {
        var form = el ? el.closest("form") : null;
        if (!form) {
            return "";
        }
        var combined = (form.id + " " + form.name + " " + form.className).toLowerCase();
        if (combined.indexOf("login") !== -1 || combined.indexOf("signin") !== -1) return "login";
        if (combined.indexOf("search") !== -1) return "search";
        if (combined.indexOf("checkout") !== -1 || combined.indexOf("payment") !== -1) return "checkout";
        if (combined.indexOf("contact") !== -1) return "contact";
        var inputs = form.querySelectorAll("input");
        var hasPassword = false;
        var hasEmail = false;
        Array.prototype.forEach.call(inputs, function (input) {
            var type = (input.type || "").toLowerCase();
            if (type === "password") hasPassword = true;
            if (type === "email") hasEmail = true;
        });
        if (hasPassword && hasEmail) return "login";
        if (hasPassword) return "auth";
        return "generic";
    }

    function calculateConfidence(el, selectors) {
        if (!el || !selectors) {
            return 0.5;
        }
        if (el.id && selectors.css.indexOf("#" + el.id) !== -1) {
            return 0.95;
        }
        if (el.name) {
            return 0.85;
        }
        if (el.getAttribute("aria-label")) {
            return 0.8;
        }
        if (getLabelText(el)) {
            return 0.75;
        }
        if (selectors.css.indexOf(":nth-of-type") !== -1) {
            return 0.3;
        }
        return 0.6;
    }

    function enrichActionWithSemantics(action, element, eventType, selectors) {
        if (!element) {
            return action;
        }
        var usedSelectors = selectors || getSelectors(element);
        action.intent = {
            verb: inferVerb(eventType, element),
            object: inferObject(element)
        };
        action.accessibility = {
            role: getRole(element),
            name: getAccessibleName(element),
            value: element.value || ""
        };
        action.context = {
            nearby_text: getNearbyText(element),
            ancestor_tags: getAncestorTags(element),
            form_hint: getFormHint(element)
        };
        action.evidence = {
            confidence: calculateConfidence(element, usedSelectors)
        };
        return action;
    }

    function recordAction(action, element, eventType) {
        var selectors = element ? getSelectors(element) : null;
        if (selectors) {
            action.selector = action.selector || selectors.css;
            action.xpath = action.xpath || selectors.xpath;
        }
        if (element) {
            action.tag_name = element.tagName ? element.tagName.toLowerCase() : "";
            action.text = safeText(element.innerText, 200);
        }
        action.timestamp = action.timestamp || Date.now();
        if (element) {
            action = enrichActionWithSemantics(action, element, eventType, selectors);
        }
        window.__recordedActions__.push(action);
        saveActions();
        updateActionCount();
        updateActionList();
    }

    function cleanAndSampleHTML(element) {
        if (!element) {
            return "";
        }
        var clone = element.cloneNode(true);
        var removeAttrs = [
            "style",
            "onclick",
            "onmouseover",
            "onmouseout",
            "onload",
            "data-reactid",
            "data-reactroot",
            "data-v-",
            "ng-",
            "tabindex",
            "aria-hidden",
            "draggable"
        ];

        function scrub(node) {
            if (!node || node.nodeType !== 1) {
                return;
            }
            removeAttrs.forEach(function (attr) {
                if (attr.endsWith("-")) {
                    var attrs = Array.prototype.slice.call(node.attributes || []);
                    attrs.forEach(function (a) {
                        if (a.name.indexOf(attr) === 0) {
                            node.removeAttribute(a.name);
                        }
                    });
                } else if (node.hasAttribute(attr)) {
                    node.removeAttribute(attr);
                }
            });
            Array.prototype.slice.call(node.children || []).forEach(scrub);
        }

        scrub(clone);
        var html = clone.outerHTML || "";
        if (html.length > 15000) {
            html = html.slice(0, 15000);
        }
        return html;
    }

    function waitForResponse(responseKey, timeoutMs) {
        return new Promise(function (resolve, reject) {
            var start = Date.now();
            var timer = setInterval(function () {
                if (window[responseKey]) {
                    var response = window[responseKey];
                    delete window[responseKey];
                    clearInterval(timer);
                    resolve(response);
                    return;
                }
                if (Date.now() - start > timeoutMs) {
                    clearInterval(timer);
                    reject(new Error("AI request timed out"));
                }
            }, 250);
        });
    }

    function showLoadingOverlay(text) {
        if (!document.body || !document.head) {
            return;
        }
        var overlay = document.getElementById("__deepagents_loading__");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "__deepagents_loading__";
            overlay.style.cssText =
                "position:fixed;inset:0;background:rgba(15,23,42,0.4);z-index:2147483647;display:flex;" +
                "align-items:center;justify-content:center;font-family:Arial,sans-serif;";
            overlay.innerHTML =
                '<div style="background:#fff;border-radius:12px;padding:16px 20px;min-width:220px;text-align:center;">' +
                '<div style="width:28px;height:28px;border:3px solid #e2e8f0;border-top-color:#1e293b;border-radius:50%;margin:0 auto 10px auto;animation:spin 1s linear infinite;"></div>' +
                '<div id="__deepagents_loading_text__" style="font-size:12px;color:#0f172a;"></div>' +
                "</div>";
            var style = document.createElement("style");
            style.textContent = "@keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}";
            document.head.appendChild(style);
            document.body.appendChild(overlay);
        }
        var textEl = overlay.querySelector("#__deepagents_loading_text__");
        if (textEl) {
            textEl.textContent = text || "Working...";
        }
        overlay.style.display = "flex";
    }

    function hideLoadingOverlay() {
        var overlay = document.getElementById("__deepagents_loading__");
        if (overlay) {
            overlay.style.display = "none";
        }
    }

    async function handleAIExtractClick(element) {
        if (!element) {
            return;
        }
        openPanelForm({
            title: "AI Extract",
            description:
                "Selected: " +
                (element.tagName ? element.tagName.toLowerCase() : "element") +
                (getAccessibleName(element) ? " (" + safeText(getAccessibleName(element), 60) + ")" : ""),
            fields: [
                {
                    id: "__deepagents_ai_prompt__",
                    label: "Requirements (optional)",
                    type: "textarea",
                    value: "",
                    placeholder: "Describe what to extract (optional)...",
                    rows: 4
                }
            ],
            okText: "Generate",
            onOk: async function (values) {
                var userPrompt = values.__deepagents_ai_prompt__ || "";
                showLoadingOverlay("Analyzing selection...");
                try {
                    var cleanedHtml = cleanAndSampleHTML(element);
                    window.__aiExtractionRequest__ = {
                        type: "extract",
                        html: cleanedHtml,
                        description: "Extract structured data from this HTML.",
                        user_prompt: userPrompt || ""
                    };
                    var result = await waitForResponse("__aiExtractionResponse__", 60000);
                    if (!result || !result.success) {
                        throw new Error(result && result.error ? result.error : "AI extraction failed");
                    }
                    if (!result.javascript) {
                        throw new Error("No JavaScript returned from AI");
                    }
                    var selectors = getSelectors(element);
                    recordAction(
                        {
                            type: "execute_js",
                            js_code: result.javascript,
                            variable_name: "ai_data_" + window.__recordedActions__.length,
                            selector: selectors.css,
                            xpath: selectors.xpath
                        },
                        element,
                        "execute_js"
                    );
                    showStatus("AI extraction code added (" + (result.used_model || "model") + ").");
                    if (window.__aiExtractMode__) {
                        toggleMode("aiExtract");
                    }
                } catch (err) {
                    console.error("[DeepAgents] AI extract error", err);
                    showStatus("AI extract failed: " + err.message);
                } finally {
                    hideLoadingOverlay();
                }
            }
        });
    }

    async function handleAIFormFillClick(element) {
        if (!element) {
            return;
        }
        var form = element.closest("form") || element;
        openPanelForm({
            title: "AI Form Fill",
            description:
                "Selected: " +
                (form.tagName ? form.tagName.toLowerCase() : "form") +
                (getAccessibleName(form) ? " (" + safeText(getAccessibleName(form), 60) + ")" : ""),
            fields: [],
            okText: "Generate",
            onOk: async function () {
                showLoadingOverlay("Preparing form fill...");
                try {
                    var cleanedHtml = cleanAndSampleHTML(form);
                    window.__aiExtractionRequest__ = {
                        type: "formfill",
                        html: cleanedHtml,
                        description: "Generate JavaScript to fill this form.",
                        user_prompt: ""
                    };
                    var result = await waitForResponse("__aiFormFillResponse__", 60000);
                    if (!result || !result.success) {
                        throw new Error(result && result.error ? result.error : "AI form fill failed");
                    }
                    if (!result.javascript) {
                        throw new Error("No JavaScript returned from AI");
                    }
                    var selectors = getSelectors(form);
                    recordAction(
                        {
                            type: "execute_js",
                            js_code: result.javascript,
                            variable_name: "ai_formfill_" + window.__recordedActions__.length,
                            selector: selectors.css,
                            xpath: selectors.xpath
                        },
                        form,
                        "execute_js"
                    );
                    showStatus("AI form fill code added (" + (result.used_model || "model") + ").");
                    if (window.__aiFormFillMode__) {
                        toggleMode("aiFormFill");
                    }
                } catch (err) {
                    console.error("[DeepAgents] AI form fill error", err);
                    showStatus("AI form fill failed: " + err.message);
                } finally {
                    hideLoadingOverlay();
                }
            }
        });
    }

    function handleExtractClick(element) {
        if (!element) {
            return;
        }
        var extractTypeEl = document.getElementById("__deepagents_extract_type__");
        var extractType = extractTypeEl ? extractTypeEl.value : "text";
        var defaultName = "data_" + window.__recordedActions__.length;
        var fields = [
            {
                id: "__deepagents_var_name__",
                label: "Variable Name",
                type: "text",
                value: defaultName,
                placeholder: "Variable name..."
            }
        ];
        if (extractType === "attribute") {
            fields.push({
                id: "__deepagents_attr_name__",
                label: "Attribute Name",
                type: "text",
                value: "href",
                placeholder: "Attribute name..."
            });
        }

        openPanelForm({
            title: "Data Extract",
            description:
                "Selected: " +
                (element.tagName ? element.tagName.toLowerCase() : "element") +
                (getAccessibleName(element) ? " (" + safeText(getAccessibleName(element), 60) + ")" : ""),
            fields: fields,
            okText: "Record",
            onOk: function (values) {
                var variableName = values.__deepagents_var_name__ || "";
                if (!variableName) {
                    showStatus("Cancelled: variable name required.");
                    return;
                }
                var action = {
                    type:
                        extractType === "html"
                            ? "extract_html"
                            : extractType === "attribute"
                              ? "extract_attribute"
                              : "extract_text",
                    extract_type: extractType,
                    variable_name: variableName
                };
                if (extractType === "attribute") {
                    var attributeName = values.__deepagents_attr_name__ || "";
                    if (!attributeName) {
                        showStatus("Cancelled: attribute name required.");
                        return;
                    }
                    action.attribute_name = attributeName;
                    action.value = element.getAttribute(attributeName) || "";
                } else if (extractType === "html") {
                    action.text = safeText(element.outerHTML || "", 200);
                } else {
                    action.text = safeText(element.innerText || "", 200);
                }
                recordAction(action, element, "extract");
                showStatus("Recorded extract: " + variableName);
                if (window.__extractMode__) {
                    toggleMode("extract");
                }
            }
        });
    }

    function getEventTarget(event) {
        if (!event) {
            return null;
        }
        var target = event.target;
        if (event.composedPath && event.composedPath().length > 0) {
            target = event.composedPath()[0];
        }
        if (!target) {
            return null;
        }
        if (target.nodeType === 3) {
            target = target.parentElement;
        }
        if (!target || target.nodeType !== 1) {
            return null;
        }
        return target;
    }

    function promoteToClickable(el) {
        if (!el || el.nodeType !== 1) {
            return null;
        }
        var current = el;
        for (var depth = 0; depth < 6 && current; depth++) {
            var tag = current.tagName ? current.tagName.toLowerCase() : "";
            var role = "";
            try {
                role = current.getAttribute ? current.getAttribute("role") || "" : "";
            } catch (e) {}
            if (
                tag === "a" ||
                tag === "button" ||
                tag === "summary" ||
                tag === "input" ||
                tag === "select" ||
                tag === "textarea" ||
                role === "button" ||
                role === "link" ||
                role === "menuitem" ||
                role === "menuitemradio" ||
                role === "option"
            ) {
                return current;
            }
            current = current.parentElement;
        }
        return el;
    }

    document.addEventListener(
        "mouseover",
        function (e) {
            var target = getEventTarget(e);
            if ((window.__extractMode__ || window.__aiExtractMode__ || window.__aiFormFillMode__) && target && !isRecorderElement(target)) {
                highlightElement(target);
            }
        },
        true
    );

    document.addEventListener(
        "mouseout",
        function () {
            if (window.__extractMode__ || window.__aiExtractMode__ || window.__aiFormFillMode__) {
                hideHighlight();
            }
        },
        true
    );

    document.addEventListener(
        "click",
        function (e) {
            if (e && e.__deepagentsHandled) {
                // If we handled selection earlier (pointerdown/mousedown), still block the page click.
                if (window.__extractMode__ || window.__aiExtractMode__ || window.__aiFormFillMode__) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.stopImmediatePropagation) {
                        e.stopImmediatePropagation();
                    }
                }
                return;
            }
            if (handleSelectionEvent(e)) {
                return;
            }

            var target = promoteToClickable(getEventTarget(e));
            if (!target || isRecorderElement(target)) {
                return;
            }
            recordAction(
                {
                    type: "click",
                    value: safeText(target.innerText, 50)
                },
                target,
                "click"
            );
        },
        true
    );

    function installPrimaryCaptureListeners(target) {
        target.addEventListener(
            "pointerdown",
            function (e) {
                if (!e || e.__deepagentsHandled) {
                    return;
                }
                e.__deepagentsHandled = handleSelectionEvent(e);
            },
            { capture: true, passive: false }
        );
        target.addEventListener(
            "mousedown",
            function (e) {
                if (!e || e.__deepagentsHandled) {
                    return;
                }
                e.__deepagentsHandled = handleSelectionEvent(e);
            },
            { capture: true, passive: false }
        );
        target.addEventListener(
            "touchstart",
            function (e) {
                if (!e || e.__deepagentsHandled) {
                    return;
                }
                e.__deepagentsHandled = handleSelectionEvent(e);
            },
            { capture: true, passive: false }
        );
    }

    installPrimaryCaptureListeners(window);
    installPrimaryCaptureListeners(document);

    function handleSelectionEvent(event) {
        var anyMode = window.__extractMode__ || window.__aiExtractMode__ || window.__aiFormFillMode__;
        if (!anyMode) {
            return false;
        }

        var target = getEventTarget(event);
        if (!target || isRecorderElement(target)) {
            return false;
        }

        if (window.__extractMode__) {
            showStatus("Captured element for Data Extract.");
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
            }
            handleExtractClick(target);
            return true;
        }
        if (window.__aiExtractMode__) {
            showStatus("Captured element for AI Extract.");
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
            }
            handleAIExtractClick(target);
            return true;
        }
        if (window.__aiFormFillMode__) {
            showStatus("Captured element for AI Form Fill.");
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
            }
            handleAIFormFillClick(target);
            return true;
        }

        return false;
    }

    document.addEventListener(
        "input",
        function (e) {
            var target = e.target;
            if (!target || isRecorderElement(target)) {
                return;
            }
            var tag = target.tagName || "";
            if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
                var selectors = getSelectors(target);
                var key = selectors.css || selectors.xpath;
                window.__lastInputValues__[key] = target.value || target.textContent || "";
                if (window.__inputTimers__[key]) {
                    clearTimeout(window.__inputTimers__[key]);
                }
                window.__inputTimers__[key] = setTimeout(function () {
                    recordAction(
                        {
                            type: "fill",
                            value: window.__lastInputValues__[key]
                        },
                        target,
                        "fill"
                    );
                    delete window.__inputTimers__[key];
                }, 600);
            }
        },
        true
    );

    document.addEventListener(
        "change",
        function (e) {
            var target = e.target;
            if (!target || isRecorderElement(target)) {
                return;
            }
            var tag = target.tagName || "";
            if (tag === "SELECT") {
                recordAction({ type: "select", value: target.value }, target, "select");
                return;
            }
            if (tag === "INPUT") {
                if (target.type === "checkbox" || target.type === "radio") {
                    recordAction({ type: target.checked ? "check" : "uncheck" }, target, target.checked ? "check" : "uncheck");
                }
            }
        },
        true
    );

    document.addEventListener(
        "keydown",
        function (e) {
            if (e.key === "Enter") {
                recordAction({ type: "press", value: "Enter" }, e.target, "press");
            }
        },
        true
    );

    var scrollTimer = null;
    document.addEventListener(
        "scroll",
        function () {
            if (scrollTimer) {
                return;
            }
            scrollTimer = setTimeout(function () {
                recordAction({ type: "scroll", value: String(window.scrollY) }, document.documentElement, "scroll");
                scrollTimer = null;
            }, 500);
        },
        true
    );

    window.addEventListener("beforeunload", saveActions);

    loadActions();
    createRecorderUI();
    buildHighlightOverlay();
    updateActionCount();
    updateActionList();

    window.__deepagentsRecorderInitialized__ = true;
    console.log("[DeepAgents] Recorder initialized");
})();
