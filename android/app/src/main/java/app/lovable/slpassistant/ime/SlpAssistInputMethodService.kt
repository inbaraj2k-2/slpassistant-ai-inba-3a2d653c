package app.lovable.slpassistant.ime

import android.graphics.drawable.ColorDrawable
import android.inputmethodservice.InputMethodService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.LinearLayout

/**
 * The standalone Android IME for SLP Assist AI.
 *
 * This service is intentionally independent of Capacitor, React, and the
 * WebView. Every edit is sent to the focused application's InputConnection,
 * which is the Android system contract for third-party keyboards.
 */
class SlpAssistInputMethodService : InputMethodService() {

    private enum class Mode { LETTERS, NUMBERS, SYMBOLS }
    private enum class Shift { OFF, ON, CAPS }

    private var mode = Mode.LETTERS
    private var shift = Shift.OFF
    private var editorInfo: EditorInfo? = null
    private var inputType: Int = InputType.TYPE_CLASS_TEXT
    private var root: LinearLayout? = null
    private val handler = Handler(Looper.getMainLooper())
    private var repeatingBackspace = false

    private val repeatBackspace = object : Runnable {
        override fun run() {
            if (!repeatingBackspace) return
            deleteText()
            handler.postDelayed(this, 55L)
        }
    }

    override fun onCreateInputView(): View {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(4), dp(4), dp(4), dp(4))
            background = ColorDrawable(getColor(android.R.color.background_light))
        }
        root = container
        rebuildKeyboard()
        return container
    }

    override fun onStartInput(attribute: EditorInfo, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        editorInfo = attribute
        inputType = attribute.inputType
        mode = when (inputType and InputType.TYPE_MASK_CLASS) {
            InputType.TYPE_CLASS_NUMBER,
            InputType.TYPE_CLASS_PHONE,
            InputType.TYPE_CLASS_DATETIME -> Mode.NUMBERS
            else -> Mode.LETTERS
        }
        shift = Shift.OFF
    }

    override fun onStartInputView(info: EditorInfo, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        editorInfo = info
        inputType = info.inputType
        rebuildKeyboard()
    }

    override fun onFinishInput() {
        stopBackspaceRepeat()
        editorInfo = null
        super.onFinishInput()
    }

    override fun onDestroy() {
        stopBackspaceRepeat()
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    private fun rebuildKeyboard() {
        val container = root ?: return
        container.removeAllViews()

        when (mode) {
            Mode.LETTERS -> buildLetterRows(container)
            Mode.NUMBERS -> buildNumberRows(container)
            Mode.SYMBOLS -> buildSymbolRows(container)
        }
    }

    private fun buildLetterRows(container: LinearLayout) {
        addRow(container, listOf("qwertyuiop".map { letterButton(it) }))
        addRow(container, listOf("asdfghjkl".map { letterButton(it) }))
        addRow(
            container,
            listOf(
                listOf(controlButton(if (shift == Shift.CAPS) "⇪" else "⇧") { toggleShift() }),
                "zxcvbnm".map { letterButton(it) },
                listOf(controlButton("⌫", ::deleteText, repeatable = true)),
            ),
        )
        addRow(
            container,
            listOf(
                listOf(controlButton("123") { mode = Mode.NUMBERS; rebuildKeyboard() }),
                listOf(controlButton("🌐", ::switchKeyboard)),
                listOf(letterOrSymbolButton(",")),
                listOf(spaceButton()),
                listOf(letterOrSymbolButton(".")),
                listOf(enterButton()),
            ),
        )
    }

    private fun buildNumberRows(container: LinearLayout) {
        addRow(container, listOf("1234567890".map { keyButton(it.toString(), action = { commit(it.toString()) }) }))
        addRow(container, listOf("-/:;()\$&@".map { keyButton(it.toString(), action = { commit(it.toString()) }) }))
        addRow(container, listOf(".,?!'".map { keyButton(it.toString(), action = { commit(it.toString()) }) }))
        addRow(
            container,
            listOf(
                listOf(controlButton("ABC") { mode = Mode.LETTERS; rebuildKeyboard() }),
                listOf(controlButton("#+=") { mode = Mode.SYMBOLS; rebuildKeyboard() }),
                listOf(controlButton("🌐", ::switchKeyboard)),
                listOf(spaceButton()),
                listOf(enterButton()),
                listOf(controlButton("⌫", ::deleteText, repeatable = true)),
            ),
        )
    }

    private fun buildSymbolRows(container: LinearLayout) {
        addRow(container, listOf("[]{}<>".map { keyButton(it.toString(), action = { commit(it.toString()) }) }))
        addRow(container, listOf("\\|~^`".map { keyButton(it.toString(), action = { commit(it.toString()) }) }))
        addRow(container, listOf("©®™°±×÷".map { keyButton(it.toString(), action = { commit(it.toString()) }) }))
        addRow(
            container,
            listOf(
                listOf(controlButton("ABC") { mode = Mode.LETTERS; rebuildKeyboard() }),
                listOf(controlButton("123") { mode = Mode.NUMBERS; rebuildKeyboard() }),
                listOf(controlButton("🌐", ::switchKeyboard)),
                listOf(spaceButton()),
                listOf(enterButton()),
                listOf(controlButton("⌫", ::deleteText, repeatable = true)),
            ),
        )
    }

    private fun addRow(container: LinearLayout, groups: List<List<Button>>) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }
        groups.flatten().forEach { button ->
            row.addView(button, LinearLayout.LayoutParams(0, dp(50), 1f).apply {
                setMargins(dp(2), dp(2), dp(2), dp(2))
            })
        }
        container.addView(row, LinearLayout.LayoutParams(-1, dp(54)))
    }

    private fun letterButton(letter: Char): Button {
        val rendered = when (shift) {
            Shift.OFF -> letter.toString()
            Shift.ON, Shift.CAPS -> letter.uppercase()
        }
        return keyButton(rendered) {
            commit(rendered)
            if (shift == Shift.ON) {
                shift = Shift.OFF
                rebuildKeyboard()
            }
        }
    }

    private fun letterOrSymbolButton(value: String): Button = keyButton(value) { commit(value) }

    private fun keyButton(label: String, action: () -> Unit): Button =
        Button(this).apply {
            text = label
            textSize = 18f
            isAllCaps = false
            setPadding(0, 0, 0, 0)
            setOnClickListener { action() }
        }

    private fun controlButton(label: String, action: () -> Unit, repeatable: Boolean = false): Button =
        keyButton(label, action).also { button ->
            if (repeatable) {
                button.setOnLongClickListener {
                    startBackspaceRepeat()
                    true
                }
                button.setOnTouchListener { _, event ->
                    if (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL) {
                        stopBackspaceRepeat()
                    }
                    false
                }
            }
        }

    private fun spaceButton(): Button = keyButton("space") { commit(" ") }

    private fun enterButton(): Button = keyButton(enterLabel()) { handleEnter() }

    private fun enterLabel(): String = when (editorInfo?.imeOptions?.and(EditorInfo.IME_MASK_ACTION)) {
        EditorInfo.IME_ACTION_GO -> "Go"
        EditorInfo.IME_ACTION_NEXT -> "Next"
        EditorInfo.IME_ACTION_SEARCH -> "Search"
        EditorInfo.IME_ACTION_SEND -> "Send"
        EditorInfo.IME_ACTION_DONE -> "Done"
        else -> "↵"
    }

    private fun toggleShift() {
        shift = when (shift) {
            Shift.OFF -> Shift.ON
            Shift.ON -> Shift.CAPS
            Shift.CAPS -> Shift.OFF
        }
        rebuildKeyboard()
    }

    private fun switchKeyboard() {
        // Android owns language/layout switching. This remains safe if there
        // is no next enabled IME, and never handles text through JavaScript.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && switchToNextInputMethod(false)) {
            return
        }
        getSystemService(InputMethodManager::class.java)?.showInputMethodPicker()
    }

    private fun commit(value: String) {
        currentInputConnection?.commitText(value, 1)
    }

    private fun deleteText() {
        val connection: InputConnection = currentInputConnection ?: return
        val selected = connection.getSelectedText(0)
        if (!selected.isNullOrEmpty()) {
            connection.commitText("", 1)
        } else {
            connection.deleteSurroundingTextInCodePoints(1, 0)
        }
    }

    private fun handleEnter() {
        val connection: InputConnection = currentInputConnection ?: return
        val action = editorInfo?.imeOptions?.and(EditorInfo.IME_MASK_ACTION) ?: EditorInfo.IME_ACTION_NONE
        val multiline = inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE != 0
        if (multiline && (action == EditorInfo.IME_ACTION_NONE || action == EditorInfo.IME_ACTION_UNSPECIFIED)) {
            connection.commitText("\n", 1)
        } else if (action != EditorInfo.IME_ACTION_NONE && action != EditorInfo.IME_ACTION_UNSPECIFIED) {
            connection.performEditorAction(action)
        } else {
            connection.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
            connection.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
        }
    }

    private fun startBackspaceRepeat() {
        if (repeatingBackspace) return
        repeatingBackspace = true
        handler.postDelayed(repeatBackspace, 300L)
    }

    private fun stopBackspaceRepeat() {
        repeatingBackspace = false
        handler.removeCallbacks(repeatBackspace)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
