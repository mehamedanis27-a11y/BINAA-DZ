  return (
    <div className="min-h-dvh bg-bg-base flex flex-col text-text-primary">
      <SVGDefs />
      <TopAppBar activePage="wizard" onNavigate={onNavigate} authenticated={true} lang={lang} onLangChange={onLangChange} />
      <NavSidebar activePage="wizard" onNavigate={onNavigate} onNewEstimation={startNewProject} />
      
      <div className="flex-1 lg:pl-60 w-full pt-[var(--topbar-height)] pb-32 flex justify-center items-start px-4">
        <main className="w-full max-w-3xl mt-6 bg-bg-surface border border-border-subtle rounded-2xl p-6 lg:p-10 shadow-xl relative flex flex-col animate-fade-in h-auto">
          {/* ── Header & Progress ── */}
          <header className="mb-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-text-primary">Configuration du Projet</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Étape</span>
                <span className="text-sm font-bold text-orange">{currentStep + 1} / {STEPS.length}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {STEPS.map((step, i) => (
                <React.Fragment key={step.id}>
                  <div 
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      i < currentStep ? 'bg-teal' :
                      i === currentStep ? 'bg-orange animate-pulse-glow' : 'bg-bg-surface-3'
                    }`}
                  />
                </React.Fragment>
              ))}
            </div>
          </header>

          <div className="flex-1">
            <div className="mb-6">
              <h3 className="text-2xl font-display font-bold mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-orange text-3xl">{STEPS[currentStep].icon}</span>
                {STEPS[currentStep].label}
              </h3>
            </div>

            {/* Step 0: Terrain */}
            {currentStep === 0 && (
              <div className="space-y-8 animate-step-in">
                {/* Dimensions */}
                <div className="glass-card p-6">
                  <SectionLabel>Dimensions de l'assiette (m)</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        className={`input-field mono ${errors.terrain_width ? 'error' : ''}`}
                        placeholder="Façade (ex: 12)"
                        value={formData.terrain_width}
                        onChange={e => updateField('terrain_width', e.target.value)}
                      />
                      <ErrorMsg message={errors.terrain_width} />
                    </div>
                    <div>
                      <input
                        type="number"
                        className={`input-field mono ${errors.terrain_depth ? 'error' : ''}`}
                        placeholder="Profondeur (ex: 20)"
                        value={formData.terrain_depth}
                        onChange={e => updateField('terrain_depth', e.target.value)}
                      />
                      <ErrorMsg message={errors.terrain_depth} />
                    </div>
                  </div>
                  {terrainArea && (
                    <div className="mt-4 p-3 bg-bg-surface-4 rounded-md border border-border-subtle flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Surface au sol calculée</span>
                      <span className="font-mono font-bold text-orange text-lg">{terrainArea} m²</span>
                    </div>
                  )}
                </div>

                {/* Localisation */}
                <div className="glass-card p-6">
                  <SectionLabel>Localisation & Risques</SectionLabel>
                  <div className="grid gap-4">
                    <div>
                      <select
                        className={`input-field ${errors.wilaya ? 'error' : ''}`}
                        value={formData.wilaya}
                        onChange={e => updateField('wilaya', e.target.value)}
                      >
                        <option value="">Sélectionnez la wilaya (01-58)</option>
                        {WILAYAS.map(w => (
                          <option key={w.code} value={w.code}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                      </select>
                      <ErrorMsg message={errors.wilaya} />
                    </div>
                    {wilayaLabel && (
                      <div className="flex gap-2 mt-2">
                        <span className={getSeismic(formData.wilaya).cls}>
                          Sismique : Zone {getSeismic(formData.wilaya).zone} ({getSeismic(formData.wilaya).label})
                        </span>
                        <span className="badge-coastal">Climat : {wilayaLabel.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Topographie */}
                <div className="glass-card p-6">
                  <SectionLabel>Topographie & Sol</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <label className="text-xs text-text-muted">État du terrain</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`option-card items-center justify-center text-center p-4 ${formData.slope_category === 'flat' ? 'selected' : ''}`}
                          onClick={() => updateField('slope_category', 'flat')}
                        >
                          <IconFlat className="w-10 h-10 mb-1" />
                          <span className="opt-label">Plat</span>
                        </button>
                        <button
                          className={`option-card items-center justify-center text-center p-4 ${formData.slope_category === 'steep' ? 'selected' : ''}`}
                          onClick={() => updateField('slope_category', 'steep')}
                        >
                          <IconSteep className="w-10 h-10 mb-1" />
                          <span className="opt-label">En pente</span>
                        </button>
                      </div>
                      <ErrorMsg message={errors.slope_category} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-text-muted">Type de sol</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`option-card items-center justify-center text-center p-4 ${formData.soil_category === 'compact' ? 'selected' : ''}`}
                          onClick={() => updateField('soil_category', 'compact')}
                        >
                          <IconRock className="w-10 h-10 mb-1" />
                          <span className="opt-label">Dur / Rocheux</span>
                        </button>
                        <button
                          className={`option-card items-center justify-center text-center p-4 ${formData.soil_category === 'unknown' ? 'selected' : ''}`}
                          onClick={() => updateField('soil_category', 'unknown')}
                        >
                          <IconUnknown className="w-10 h-10 mb-1" />
                          <span className="opt-label">Inconnu</span>
                        </button>
                      </div>
                      <ErrorMsg message={errors.soil_category} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs text-text-muted block">Orientation de la façade principale (rue)</label>
                    <div className="flex gap-2">
                      {['N', 'S', 'E', 'W'].map(ori => (
                        <button
                          key={ori}
                          className={`flex-1 py-2.5 rounded-md border text-sm font-bold transition-all cursor-pointer ${
                            formData.street_orientation === ori 
                              ? 'bg-orange border-orange text-white shadow-md' 
                              : 'border-border-subtle text-text-secondary hover:bg-bg-surface-4'
                          }`}
                          onClick={() => updateField('street_orientation', ori)}
                        >
                          {ori === 'N' ? 'N (Nord)' : ori === 'S' ? 'S (Sud)' : ori === 'E' ? 'E (Est)' : 'O (Ouest)'}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-bg-surface-2 rounded-xl border border-border-subtle mt-2">
                      <IconCompassRose direction={formData.street_orientation} className="w-16 h-16" />
                      <span className="text-[11px] text-text-muted mt-2 font-mono font-medium">Orientation de la rue</span>
                    </div>
                    <ErrorMsg message={errors.street_orientation} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Budget */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-step-in">
                <div className="glass-card p-6">
                  <SectionLabel>Enveloppe budgétaire globale (DZD)</SectionLabel>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      className={`input-field mono text-2xl py-4 pl-12 ${errors.budget ? 'error' : ''}`}
                      placeholder="Ex: 15 000 000"
                      value={formatNumber(formData.budget)}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '')
                        updateField('budget', raw ? parseInt(raw, 10) : '')
                      }}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">DA</span>
                  </div>
                  <ErrorMsg message={errors.budget} />
                  <Hint icon="lightbulb">Saisissez le montant total dont vous disposez. L'IA déduira les frais annexes si cochés ci-dessous.</Hint>
                </div>

                <div className="glass-card p-6">
                  <SectionLabel>Le budget ci-dessus inclut-il :</SectionLabel>
                  <div className="space-y-3 mt-4">
                    {[
                      { id: 'budget_includes_land', label: 'L\'achat du terrain (≈ 40%)' },
                      { id: 'budget_includes_architect', label: 'Études architecte & génie civil (≈ 3%)' },
                      { id: 'budget_includes_admin', label: 'Permis & démarches administratives (≈ 3%)' },
                      { id: 'budget_includes_furniture', label: 'Ameublement & équipement (≈ 8%)' },
                    ].map(item => (
                      <label key={item.id} className="flex items-center gap-3 p-3 rounded-md border border-border-subtle hover:bg-bg-surface-4 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-orange rounded bg-bg-surface-2 border-border-strong"
                          checked={formData[item.id]}
                          onChange={e => updateField(item.id, e.target.checked)}
                        />
                        <span className="text-sm font-medium text-text-primary">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-md bg-bg-surface-2 border-l-4 border-teal flex justify-between items-center">
                    <div>
                      <span className="block text-xs text-text-muted font-semibold uppercase">Budget net construction</span>
                      <span className="text-xl font-mono font-bold text-teal">{formatNumber(computeConstructionBudget())} DA</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Volume */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-step-in">
                <div className="glass-card p-6">
                  <SectionLabel>Gabarit de la maison</SectionLabel>
                  <div className="grid gap-3">
                    {FLOOR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`option-card flex-row items-center p-4 gap-4 ${formData.floors === opt.value ? 'selected' : ''}`}
                        onClick={() => updateField('floors', opt.value)}
                      >
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                          {opt.value === 0 && <IconR0 className="w-12 h-12" />}
                          {opt.value === 1 && <IconR1 className="w-12 h-12" />}
                          {opt.value === 2 && <IconR2 className="w-12 h-12" />}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-lg text-text-primary">{opt.label}</div>
                          <div className="text-sm text-text-secondary">{opt.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <ErrorMsg message={errors.floors} />
                </div>

                <div className="glass-card p-6">
                  <SectionLabel>Anticipation d'extensions futures</SectionLabel>
                  <p className="text-sm text-text-secondary mb-4">
                    Prévoyez-vous d'ajouter des étages plus tard ? (L'IA surdimensionnera les fondations et les poteaux)
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="3"
                      className="flex-1 accent-orange"
                      value={formData.future_floors}
                      onChange={e => updateField('future_floors', parseInt(e.target.value, 10))}
                    />
                    <div className="font-mono text-lg font-bold text-orange w-12 text-center">
                      +{formData.future_floors}
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <SectionLabel>Type de toiture</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`option-card items-center justify-center text-center p-4 ${formData.roof_type === 'terrasse_plate' ? 'selected' : ''}`}
                      onClick={() => updateField('roof_type', 'terrasse_plate')}
                    >
                      <IconRoofFlat className="w-10 h-10 mb-2" />
                      <span className="font-bold">Terrasse plate</span>
                      <span className="text-xs text-text-muted">Standard Algérie</span>
                    </button>
                    <button
                      className={`option-card items-center justify-center text-center p-4 ${formData.roof_type === 'tuiles' ? 'selected' : ''}`}
                      onClick={() => updateField('roof_type', 'tuiles')}
                    >
                      <IconRoofTiled className="w-10 h-10 mb-2" />
                      <span className="font-bold">Tuiles</span>
                      <span className="text-xs text-text-muted">Pente / Charpente</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Famille */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-step-in">
                <div className="glass-card p-6">
                  <SectionLabel>Composition du foyer</SectionLabel>
                  <div className="flex items-center gap-6 mt-4">
                    <button 
                      className="w-12 h-12 rounded-full border border-border-strong flex items-center justify-center text-2xl hover:bg-bg-surface-4 transition-colors"
                      onClick={() => updateField('family_size', Math.max(1, familyValue - 1))}
                    >
                      -
                    </button>
                    <div className="flex-1 text-center font-mono text-4xl font-bold text-orange">
                      {familyValue || 0}
                    </div>
                    <button 
                      className="w-12 h-12 rounded-full border border-border-strong flex items-center justify-center text-2xl hover:bg-bg-surface-4 transition-colors"
                      onClick={() => updateField('family_size', familyValue + 1)}
                    >
                      +
                    </button>
                  </div>
                  <ErrorMsg message={errors.family_size} />
                </div>

                <div className="glass-card p-6">
                  <SectionLabel>Cohabitation (Générations)</SectionLabel>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      className={`option-card ${formData.generations === 1 ? 'selected' : ''}`}
                      onClick={() => updateField('generations', 1)}
                    >
                      <span className="font-bold">1 génération</span>
                      <span className="text-xs">Parents + enfants</span>
                    </button>
                    <button
                      className={`option-card ${formData.generations === 2 ? 'selected' : ''}`}
                      onClick={() => updateField('generations', 2)}
                    >
                      <span className="font-bold">2 générations</span>
                      <span className="text-xs">Avec grands-parents</span>
                    </button>
                  </div>
                  {formData.generations > 1 && (
                    <label className="flex items-center gap-3 mt-4 p-3 rounded-md bg-bg-surface-4 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-orange rounded bg-bg-surface-2 border-border-strong"
                        checked={formData.independent_generations}
                        onChange={e => updateField('independent_generations', e.target.checked)}
                      />
                      <span className="text-sm font-medium">Créer des espaces de vie indépendants</span>
                    </label>
                  )}
                </div>

                <div className="glass-card p-6">
                  <SectionLabel>Mode de vie</SectionLabel>
                  <div className="space-y-6 mt-4">
                    <div>
                      <label className="text-sm font-medium text-text-secondary block mb-3">Réception d'invités</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'LOW', label: 'Rarement' },
                          { id: 'MEDIUM', label: 'Régulièrement' },
                          { id: 'HIGH', label: 'Fréquemment' }
                        ].map(freq => (
                          <button
                            key={freq.id}
                            className={`flex-1 py-2 px-3 rounded-full border text-sm font-medium transition-colors ${
                              formData.guest_frequency === freq.id 
                                ? 'bg-orange border-orange text-white' 
                                : 'border-border-strong text-text-secondary hover:bg-bg-surface-4'
                            }`}
                            onClick={() => updateField('guest_frequency', freq.id)}
                          >
                            {freq.label}
                          </button>
                        ))}
                      </div>
                      <ErrorMsg message={errors.guest_frequency} />
                    </div>

                    <div className="border-t border-border-subtle pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-text-secondary">Véhicules à garer</label>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-text-secondary">Possédez-vous un véhicule ?</span>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={formData.has_car}
                              onChange={e => updateField('has_car', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                      
                      {formData.has_car && (
                        <div className="flex gap-2">
                          {[1, 2, 3].map(num => (
                            <button
                              key={num}
                              className={`flex-1 py-3 rounded-md border text-lg font-bold transition-colors ${
                                formData.car_count === num 
                                  ? 'bg-teal border-teal text-white' 
                                  : 'border-border-strong text-text-secondary hover:bg-bg-surface-4'
                              }`}
                              onClick={() => updateField('car_count', num)}
                            >
                              {num} <span className="text-sm font-normal material-symbols-outlined ml-1">directions_car</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Finitions */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-step-in">
                {[
                  {
                    id: 'economy',
                    label: 'Économique',
                    badge: 'badge-economy',
                    price: 'Prix bas',
                    items: ['Menuiserie locale PVC', 'Dalle de sol locale', 'Peinture monocouche', 'Sanitaires basiques']
                  },
                  {
                    id: 'standard',
                    label: 'Standard',
                    badge: 'badge-standard',
                    price: 'Milieu de gamme',
                    items: ['Aluminium double vitrage', 'Dalle de sol 1er choix', 'Peinture vinyle / satinée', 'Sanitaires import / haute qualité']
                  },
                  {
                    id: 'premium',
                    label: 'Haut Standing',
                    badge: 'badge-premium',
                    price: 'Luxe',
                    items: ['Aluminium TPR / Rideaux ext', 'Marbre / Porcelaine', 'Peinture décorative', 'Chauffage central / Clim encastrée']
                  }
                ].map(level => (
                  <button
                    key={level.id}
                    className={`option-card p-5 gap-4 relative overflow-hidden text-left ${formData.finish_level === level.id ? 'selected teal-accent' : ''}`}
                    onClick={() => updateField('finish_level', level.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-display font-bold text-lg">{level.label}</div>
                      <span className={level.badge}>{level.price}</span>
                    </div>
                    <ul className="text-sm text-text-secondary space-y-2 mt-2">
                      {level.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-teal text-sm">check_circle</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    {formData.finish_level === level.id && (
                      <div className="absolute inset-0 border-2 border-teal rounded-md pointer-events-none"></div>
                    )}
                  </button>
                ))}
                <ErrorMsg message={errors.finish_level} />
              </div>
            )}

            {/* Step 5: Résumé */}
            {currentStep === 5 && (
              <div className="space-y-8 animate-step-in">
                <div className="glass-card p-6 border-l-4 border-orange">
                  <h3 className="text-lg font-bold mb-4">Vérification des données</h3>
                  
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Terrain</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formData.terrain_width} × {formData.terrain_depth} m ({terrainArea} m²)</span>
                        <button onClick={() => goToStep(0)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Localisation</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">Wilaya {formData.wilaya}</span>
                        <button onClick={() => goToStep(0)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Budget Net</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-teal">{formatNumber(computeConstructionBudget())} DA</span>
                        <button onClick={() => goToStep(1)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Volume</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{floorLabel?.label} (+{formData.future_floors} futurs)</span>
                        <button onClick={() => goToStep(2)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Famille</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formData.family_size} pers. ({formData.generations} gen)</span>
                        <button onClick={() => goToStep(3)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="text-text-muted">Finitions</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold capitalize">{formData.finish_level}</span>
                        <button onClick={() => goToStep(4)} className="text-orange hover:opacity-80"><span className="material-symbols-outlined text-sm">edit</span></button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-dim rounded-lg p-6 text-center">
                  <span className="material-symbols-outlined text-orange text-4xl mb-3">auto_awesome</span>
                  <h4 className="text-lg font-bold text-text-primary mb-2">Prêt à générer ?</h4>
                  <p className="text-sm text-text-secondary mb-6">
                    Notre IA architecturale va traiter vos critères, appliquer les normes de construction algériennes et optimiser vos espaces en temps réel.
                  </p>
                  <button 
                    className="btn-primary lg w-full"
                    onClick={handleSubmit}
                  >
                    Lancer l'Intelligence Artificielle
                    <span className="material-symbols-outlined ml-2">rocket_launch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Fixed Footer Navigation ── */}
      <footer className="fixed bottom-0 left-0 lg:left-60 right-0 bg-bg-surface/95 backdrop-blur-md border-t border-border-subtle p-4 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          {currentStep > 0 ? (
            <button className="btn-ghost" onClick={goBack}>
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Retour
            </button>
          ) : (
            <div></div>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <button className="btn-primary" onClick={goNext}>
              Suivant
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          ) : null}
        </div>
      </footer>

      {/* ── Loading Overlay ── */}
      {status === 'loading' && (
        <div className="status-overlay">
          <div className="text-center bg-bg-surface-2 p-8 rounded-xl border border-border-strong shadow-2xl max-w-sm w-full mx-4">
            <div className="spinner"></div>
            <h3 className="text-xl font-bold mb-2">Génération en cours</h3>
            <div className="text-sm text-text-secondary h-6 overflow-hidden">
              <div className="animate-[scrollText_8s_steps(4)_infinite]">
                <div>Analyse topographique...</div>
                <div>Application règles d'urbanisme...</div>
                <div>Calcul devis structure...</div>
                <div>Optimisation des espaces...</div>
              </div>
            </div>
            <div className="mt-6 h-1 w-full bg-border-light rounded-full overflow-hidden">
              <div className="h-full bg-orange animate-[pulseWidth_2s_ease-in-out_infinite]"></div>
            </div>
            <p className="text-xs text-text-muted mt-4">Environ 5 à 15 secondes...</p>
          </div>
        </div>
      )}

      {/* ── Error Overlay ── */}
      {status === 'error' && (
        <div className="status-overlay">
          <div className="text-center bg-bg-surface-2 p-8 rounded-xl border border-danger shadow-2xl max-w-sm w-full mx-4 animate-scale-in">
            <span className="material-symbols-outlined text-danger text-5xl mb-4">error</span>
            <h3 className="text-xl font-bold mb-2 text-danger">Erreur de Génération</h3>
            <p className="text-sm text-text-secondary mb-6">{errorMessage}</p>
            <div className="text-left bg-bg-surface-4 p-4 rounded-md mb-6 max-h-32 overflow-y-auto border border-border-subtle">
              {Object.entries(errors).map(([key, msg]) => (
                <div key={key} className="text-xs text-danger flex items-start gap-2 mb-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  {msg}
                </div>
              ))}
            </div>
            <button className="btn-ghost w-full justify-center" onClick={dismissError}>
              Corriger les erreurs
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
