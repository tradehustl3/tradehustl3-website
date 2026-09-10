from pathlib import Path

path = Path('app/resume-builder/intake/wizard.tsx')
text = path.read_text()

text = text.replace('  const [importConsent, setImportConsent] = useState(false);\n', '  const [importConsent, setImportConsent] = useState(false);\n  const [editingImportedDetails, setEditingImportedDetails] = useState(false);\n', 1)

text = text.replace('      setData(nextData);\n      setStep(0);\n      setImportState("done");\n', '      setData(nextData);\n      setEditingImportedDetails(false);\n      setStep(0);\n      setImportState("done");\n', 1)

text = text.replace('  const uploadedResumeMode = data.sourceProvenance === "upload" && Boolean(data.sourceResumeText.trim());\n', '  const uploadedResumeMode = data.sourceProvenance === "upload" && Boolean(data.sourceResumeText.trim());\n  const uploadVerificationMode = uploadedResumeMode && !editingImportedDetails;\n', 1)

text = text.replace('      <WizardProgress step={step} percent={percent} onJump={editStep} />\n', '      {!uploadVerificationMode ? <WizardProgress step={step} percent={percent} onJump={editStep} /> : null}\n', 1)

text = text.replace('          <p className="rb-kicker">/ BUILD · STEP {step + 1} OF {WIZARD_STEPS.length}</p>\n', '          <p className="rb-kicker">{uploadVerificationMode ? "/ UPLOAD · VERIFY · ENHANCE" : `/ BUILD · STEP ${step + 1} OF ${WIZARD_STEPS.length}`}</p>\n', 1)

text = text.replace('{!(step === 0 && uploadedResumeMode) ? (', '{!uploadVerificationMode ? (', 1)

text = text.replace('              <button\n                type="button"\n                className="rb-button rb-button-ghost"\n                onClick={() => {\n                  if (!isTradeTrack(data.trade)) {\n                    setImportState("build-error");\n                    setImportMessage("Choose the closest trade below before editing the imported details.");\n                    return;\n                  }\n                  void goNext();\n                }}\n                disabled={importState === "building"}\n              >\n                EDIT IMPORTED DETAILS\n              </button>\n              <small>Only use Edit Imported Details if you want to change something HUSTL3 BOT pulled from your resume.</small>\n', '              <button\n                type="button"\n                className="rb-button rb-button-ghost"\n                onClick={() => {\n                  if (!isTradeTrack(data.trade)) {\n                    setImportState("build-error");\n                    setImportMessage("Choose the closest trade below before correcting imported details.");\n                    return;\n                  }\n                  setEditingImportedDetails(true);\n                  void goNext();\n                }}\n                disabled={importState === "building"}\n              >\n                CORRECT IMPORTED DETAILS (OPTIONAL)\n              </button>\n              <small>Only open the form if something on the uploaded resume needs to be corrected. You do not need to re-enter information HUSTL3 BOT already captured.</small>\n', 1)

path.write_text(text)
