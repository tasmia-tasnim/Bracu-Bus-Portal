function ChoosePlan({ setActive, fare, setPlan, currentUser, setCurrentUser, bookingInfo, isPlanLocked }) {
  const [plans, setPlans] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("http://localhost:9255/api/plans")
      .then(res => res.json())
      .then(data => { setPlans(data); setSelected(data[0]?.name); setLoading(false); })
      .catch(err => { console.log(err); setLoading(false); });
  }, []);

  const getPrice = (plan) => {
    if (plan.discount_percent === 0) return `৳${fare}/ride`;
    const monthly = fare * plan.rides_per_day * 30;
    return `৳${monthly}/mo`;
  };

  const getSave = (plan) => {
    if (plan.discount_percent === 0) return null;
    const monthly = fare * plan.rides_per_day * 30;
    return `Save ৳${Math.round(monthly * plan.discount_percent / 100)}`;
  };

  const handleSave = async () => {
    const planObj = plans.find(p => p.name === selected);
    try {
      const res = await fetch(`http://localhost:9255/api/students/${currentUser.studentId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: planObj.name,
          plan_fare: fare,
          plan_route_id: bookingInfo.route_id,
          plan_route_name: bookingInfo.route_name,
          plan_stoppage_id: bookingInfo.stoppage_id,
          plan_stoppage_name: bookingInfo.stoppage_name,
          plan_expires_at: planObj.discount_percent === 0 ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setCurrentUser(prev => ({
        ...prev,
        plan_name: planObj.name,
        plan_fare: fare,
        plan_route_id: bookingInfo.route_id,
        plan_route_name: bookingInfo.route_name,
        plan_stoppage_id: bookingInfo.stoppage_id,
        plan_stoppage_name: bookingInfo.stoppage_name,
      }));
      setPlan(selected);
      setActive("Dashboard");
    } catch (err) {
      alert('Failed to save plan.');
    }
  };

  // --- Plan locked screen ---
  if (isPlanLocked && isPlanLocked(currentUser)) {
    const expiryStr = new Date(currentUser.plan_expires_at).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    return (
      <div className="content">
        <div className="confirm-card" style={{ textAlign: 'center' }}>
          <div className="confirm-emoji">🔒</div>
          <div className="confirm-title">Plan Locked</div>
          <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '18px' }}>
            You are on the <strong style={{ color: '#a78bfa' }}>{currentUser.plan_name}</strong> plan.<br />
            You cannot change your plan until it expires.
          </p>
          <div className="confirm-details">
            <div className="confirm-row">
              <span className="confirm-label">Route:</span>
              <span className="confirm-value">{currentUser.plan_route_name}</span>
            </div>
            <div className="confirm-row">
              <span className="confirm-label">Stoppage:</span>
              <span className="confirm-value">{currentUser.plan_stoppage_name}</span>
            </div>
            <div className="confirm-row">
              <span className="confirm-label">Plan expires:</span>
              <span className="confirm-value" style={{ color: '#f59e0b', fontWeight: 700 }}>{expiryStr}</span>
            </div>
          </div>
          <button className="proceed-btn" style={{ marginTop: '20px' }} onClick={() => setActive("Booking")}>
            Book a Seat →
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="content"><p style={{padding:"20px"}}>Loading plans...</p></div>;

  return (
    <div className="content">
      <div className="section-label">Step 3 — Choose a Plan</div>

      {plans.map((plan) => (
        <div
          key={plan._id}
          className={`plan-card ${selected === plan.name ? "plan-selected" : ""}`}
          onClick={() => setSelected(plan.name)}
        >
          <div className="plan-top">
            <div>
              <div className="plan-name">
                {plan.name}
                {plan.badge && <span className={`plan-badge ${plan.badge_class}`}>{plan.badge}</span>}
              </div>
              <div className="plan-desc">{plan.desc}</div>
              <div className="plan-sub">{plan.sub}</div>
            </div>
            <div className="plan-right">
              <div className="plan-price">{getPrice(plan)}</div>
              {getSave(plan) && <div className="plan-save">{getSave(plan)}</div>}
            </div>
          </div>
          {selected === plan.name && (
            <div className="plan-selected-msg">✓ Selected — click Proceed to Booking</div>
          )}
        </div>
      ))}

      <button
        className="proceed-btn"
        disabled={!selected}
        onClick={handleSave}
      >
        Save plan
      </button>
    </div>
  );
}