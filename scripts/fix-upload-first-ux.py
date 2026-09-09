from pathlib import Path

path = Path('app/resume-builder/intake/wizard.tsx')
text = path.read_text()

text = text.replace('''      const nextData = mergeResumePrefill(dataRef.current, result.prefill, text);\n      setData(nextData);\n      setImportState("done");\n      setImportMessage("Resume imported. Enhance it now, or review and add details first.");\n''','''      const nextData = mergeResumePrefill(dataRef.current, result.prefill, text);\n      setData(nextData);\n      setStep(0);\n      setImportState("done");\n      setImportMessage("Resume imported and verified. Choose the closest trade only if needed, then build your preview. You do not need to re-enter information already on your resume.");\n''',1)

text = text.replace('''  const activeStep = WIZARD_STEPS[step];\n  const percent = Math.round((step / LAST_STEP) * 100);\n  const showConsent = !paid && step === LAST_STEP;\n''','''  const activeStep = WIZARD_STEPS[step];\n  const percent = Math.round((step / LAST_STEP) * 100);\n  const showConsent = !paid && step === LAST_STEP;\n  const uploadedResumeMode = data.sourceProvenance === "upload" && Boolean(data.sourceResumeText.trim());\n''',1)

text = text.replace('''          <div className="rb-wiz-nav">\n''','''          {!(step === 0 && uploadedResumeMode) ? (\n          <div className="rb-wiz-nav">\n''',1)
text = text.replace('''          </div>\n        </div>\n\n        <div className="rb-wiz-side">\n''','''          </div>\n          ) : null}\n        </div>\n\n        <div className="rb-wiz-side">\n''',1)

text = text.replace('''                REVIEW & ADD DETAILS\n''','''                EDIT IMPORTED DETAILS\n''',1)
text = text.replace('''                    setImportMessage("Choose the closest trade below before reviewing the imported details.");\n''','''                    setImportMessage("Choose the closest trade below before editing the imported details.");\n''',1)

text = text.replace('''              </button>\n            </div>\n          ) : null}\n        </div>\n        <p className="rb-resume-import-divider"><span>OR START FROM SCRATCH</span></p>\n''','''              </button>\n              <small>Only use Edit Imported Details if you want to change something HUSTL3 BOT pulled from your resume.</small>\n            </div>\n          ) : null}\n        </div>\n        {!uploadedResumeMode ? (\n          <p className="rb-resume-import-divider"><span>OR START FROM SCRATCH</span></p>\n        ) : !isTradeTrack(data.trade) ? (\n          <p className="rb-resume-import-divider"><span>ONE THING TO CONFIRM — CHOOSE YOUR CLOSEST TRADE</span></p>\n        ) : null}\n''',1)

path.write_text(text)
