# Deep content for the two Featured Visa pages (original copy, site facts only).
_CMP_1YR = '''<table class="vtable"><tr><th></th><th class="hl">1 Year Multiple Entry</th><th>90 Days Multiple Entry</th></tr>
<tr><td><b>Visa validity</b></td><td class="hl">1 year from issue</td><td>90 days from issue</td></tr>
<tr><td><b>Stay allowed</b></td><td class="hl">Up to 90 days per visit</td><td>Up to 30 days per stay</td></tr>
<tr><td><b>Entries</b></td><td class="hl">Multiple</td><td>Multiple</td></tr>
<tr><td><b>Total stay rule</b></td><td class="hl">Maximum 180 days across the year</td><td>All stays must fit inside the 90-day validity</td></tr>
<tr><td><b>Best for</b></td><td class="hl">A full year of trips - events, family, business visits, Umrah</td><td>A cluster of trips inside one season</td></tr></table>'''
_CMP_90D = _CMP_1YR.replace('<th class="hl">1 Year Multiple Entry</th><th>90 Days Multiple Entry</th>', '<th>1 Year Multiple Entry</th><th class="hl">90 Days Multiple Entry</th>').replace('<td class="hl">', '<td>').replace('<td>90 days from issue</td>', '<td class="hl">90 days from issue</td>').replace('<td>Up to 30 days per stay</td>', '<td class="hl">Up to 30 days per stay</td>').replace('<td>All stays must fit inside the 90-day validity</td>', '<td class="hl">All stays must fit inside the 90-day validity</td>').replace('<td>A cluster of trips inside one season</td>', '<td class="hl">A cluster of trips inside one season</td>')

_ROUTES = '''<ul>
<li><b>Passport holders of the 72 eVisa-eligible countries</b> - the straightforward online route.</li>
<li><b>GCC residents of any nationality</b> - you apply on your residence permit (passport valid 6+ months, residency valid 3+ months).</li>
<li><b>Holders of a used US, UK or Schengen visa</b> - you are assessed for the visa-on-arrival / eVisa route; we confirm which applies to you.</li>
<li><b>Everyone else</b> - a sponsored visit visa is usually the route; message us your nationality and we will tell you honestly what is possible before you pay anything.</li>
</ul>
<p>One honest note: fourteen of the eligible nationalities receive a single-entry 30-day version of the tourist eVisa instead of the multiple-entry one. If that applies to your passport, we tell you before you apply - never after.</p>'''

_PROCESS = '''<p>There is no honest fixed number of days anyone can promise - the decision is the authority's, not ours. What we can promise is the process: you apply here in a few minutes, a specialist checks every document by hand before anything is submitted, the application goes to the Saudi authority, and you watch each stage live on our tracking page - received, document check, submitted, with the authority, decision, eVisa ready. Your expected timing is confirmed in writing with your total before you pay anything, and if the authority asks for anything extra, you hear it from us the same day.</p>'''

_TIPS = '''<ul>
<li>Your passport should be valid for at least six months beyond your travel dates.</li>
<li>Your photo needs a plain light background, face fully visible, no glasses glare.</li>
<li>Your name and passport number must match your passport exactly - most delays start here.</li>
<li>Apply before you book anything non-refundable, and keep a printed copy of the eVisa with your passport when you travel.</li>
</ul>'''

DEEP = {
"one-year-multiple": f'''<section class="deepsec"><div class="wrap" style="max-width:900px">
<h2>What is the 1 Year Multiple Entry Visa?</h2>
<p>It is the Saudi tourist eVisa arranged the way most repeat travellers actually use it: one approval that covers a full year of trips. Instead of applying again before every journey, you apply once, receive the eVisa electronically, and then come and go across the year - for holidays, events, visiting family and friends, business meetings, and Umrah outside the Hajj season. The visa is issued by the Saudi authority and includes the mandatory medical insurance for your trips. We prepare the application, a specialist checks it by hand before submission, and you track it live until the eVisa is in your inbox.</p>
<h2>Who can apply?</h2>
{_ROUTES}
<h2>What does it allow?</h2>
<ul>
<li>Multiple entries across one full year from the issue date.</li>
<li>Stays of up to 90 days per visit, with a maximum of 180 days in total across the year.</li>
<li>Tourism, events and visiting family and friends anywhere in the Kingdom.</li>
<li>Umrah at any time outside Hajj season (book your Nusuk permit for Umrah and Rawdah slots).</li>
<li>Business meetings and conferences - it is not a work permit, and it does not allow employment.</li>
</ul>
<h2>1 Year vs 90 Days - which one fits you?</h2>
{_CMP_1YR}
<p>If your trips are spread across a year, the 1 Year visa is almost always the better value - one application instead of several. If everything happens inside one season, compare the 90 Days option above.</p>
<h2>Processing time and what to expect</h2>
{_PROCESS}
<h2>Using your visa across a year of trips</h2>
<p>The two numbers to respect are 90 and 180: no single visit can pass 90 days, and your visits together cannot pass 180 days inside the year. Frequent travellers keep a simple note of entry and exit dates - Saudi border records are exact, and overstays are fined per day. Carry the printed eVisa and travel on the same passport you applied with; if your plans change mid-year, a new trip needs no new application while the visa stays valid.</p>
<h2>Tips for a smooth application</h2>
{_TIPS}
</div></section>''',
"ninety-day-multiple": f'''<section class="deepsec"><div class="wrap" style="max-width:900px">
<h2>What is the 90 Days Multiple Entry Visa?</h2>
<p>It is the shorter-window option: a multiple-entry visa arranged for a cluster of trips that all fall inside one 90-day season - school holidays, a project with repeat visits, a tournament season, or a family occasion that brings you back more than once. You apply once, travel in and out while the visa is valid, and stay up to 30 days on each trip. Before you pay anything, we confirm in writing exactly which visa class will be requested for you and what it allows, so the validity and stay you read here are the ones on your issued visa - no surprises at the border.</p>
<h2>Who should choose it?</h2>
<ul>
<li>Travellers whose trips all sit inside one season of roughly three months.</li>
<li>Anyone making several short trips close together - two or three journeys of a few weeks each.</li>
<li>Visitors who do not need a full year of cover and prefer the lighter option.</li>
</ul>
<p>If your trips spread beyond one season, the 1 Year Multiple Entry Visa is usually the better fit - and if you qualify for it, we will tell you before you apply.</p>
<h2>Who can apply?</h2>
{_ROUTES}
<h2>What does it allow?</h2>
<ul>
<li>Multiple entries at any point inside the 90-day validity.</li>
<li>Stays of up to 30 days per trip.</li>
<li>Tourism, events, family visits and Umrah outside Hajj season (with a Nusuk permit for Umrah slots).</li>
</ul>
<h2>90 Days vs 1 Year - which one fits you?</h2>
{_CMP_90D}
<h2>Processing time and what to expect</h2>
{_PROCESS}
<h2>Using your visa for more than one trip</h2>
<p>Every entry has to happen while the visa is valid, and each stay is capped at 30 days - a stay cannot run past the visa's validity, so plan the last trip backwards from the expiry date and we will check your dates with you before you book. Keep a printed copy of the visa with your passport, and travel on the same passport you applied with.</p>
<h2>Tips for a smooth application</h2>
{_TIPS}
</div></section>''',
}

DEEP_FAQS = {
"one-year-multiple": [
("Can I perform Umrah on the 1 Year Multiple Entry Visa?", "Yes. The tourist eVisa covers Umrah at any time outside the Hajj season. Book your Umrah and Rawdah time slots in the Nusuk app before you travel, and note that Hajj itself always needs the official Hajj visa."),
("How many days can I stay in Saudi Arabia in total?", "Up to 90 days per visit, and no more than 180 days across the whole year of validity. Both limits matter - a fourth long visit can break the annual ceiling even when each visit alone was under 90 days."),
("Can I extend a stay instead of leaving?", "No - a tourist eVisa stay cannot be extended. Leave before your 90 days end; while the visa is still valid you can return for another visit, counting against the 180-day annual total."),
("When does the year start?", "On the issue date printed on the eVisa, not on your first entry. If you apply early, the clock is already running, so we usually suggest applying closer to your first trip."),
("What if my passport is renewed during the year?", "The eVisa is linked to the passport you applied with. Tell us before you travel and we will confirm the current rule for your case - do not just arrive with a different passport and hope for the best."),
],
"ninety-day-multiple": [
("Is the 90 days the validity or the stay?", "The validity. The visa lasts 90 days from issue, and inside that window each stay can be up to 30 days. The two numbers are different things, and mixing them up is the most common mistake with this visa."),
("How many trips can I take on it?", "As many as fit inside the validity - there is no fixed trip count. Every entry must be within the 90 days, and every stay within 30 days."),
("Can I extend a 30-day stay?", "No. Plan each trip to end inside both limits - the 30-day stay and the visa's expiry. If a trip needs longer, the 1 Year visa with 90-day visits is the right product instead."),
("What exactly will be issued for my application?", "That is confirmed to you in writing before you pay: the visa class requested, its validity, the stay it allows and your total. If the authority issues a different class than the one confirmed, we tell you immediately and your options are explained before anything else happens."),
("Can I switch to the 1 Year visa later?", "A issued visa cannot be converted, but once it expires you can apply for the 1 Year Multiple Entry Visa - and if you qualify for it now, we will say so before you choose."),
],
}
