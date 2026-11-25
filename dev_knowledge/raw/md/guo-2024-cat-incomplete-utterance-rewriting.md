Context-Aware Tracking and Dynamic Introduction for Incomplete
|     | Utterance |     |     | Rewriting | in  | Extended |     | Multi-Turn |     | Dialogues |     |     |
| --- | --------- | --- | --- | --------- | --- | -------- | --- | ---------- | --- | --------- | --- | --- |
XinnanGuo1,QianZhu1,QiuhuiShi1,XuanLin1,LiubinWang1,DaqianLi1,YongruiChen
1AntGroup,China
guoxinnan0727@163.com,zq371417,qiuhui.sqh,daxuan.lx,daqian.ldq@antgroup.com,
ubiwang@gmail.com,yrchen@seu.edu.cn
Abstract
Incompleteutterancerewriting(IUR)aimsto
reconstructtheutterancewithomittedinforma-
| tion                    | and pronouns          |          | to be | standalone       | and com-     |     |     |     |     |     |     |     |
| ----------------------- | --------------------- | -------- | ----- | ---------------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
| pletebasedonthecontext. |                       |          |       | Theexistingworks |              |     |     |     |     |     |     |     |
| predominantly           |                       | focus    | on    | simple           | ellipsis and |     |     |     |     |     |     |     |
| coreference             |                       | problems | in    | brief multi-turn | dia-         |     |     |     |     |     |     |     |
| logues.                 | Butinactualscenarios: |          |       |                  | 1)thecontext |     |     |     |     |     |     |     |
ofthedialoguesfrequentlycomprisesmultiple
similarcandidatesforellipsisandcoreference
| resolution,pouringtoconfuse. |     |     |     |     | 2)thenumber |     |     |     |     |     |     |     |
| ---------------------------- | --- | --- | --- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
ofturnstendstobemoreextensive,whilethe
| content  | with                          | various               | topics   | also   | grows more |     |     |     |     |     |     |     |
| -------- | ----------------------------- | --------------------- | -------- | ------ | ---------- | --- | --- | --- | --- | --- | --- | --- |
| complex. | Thispaperproposesanovelmethod |                       |          |        |            |     |     |     |     |     |     |     |
| called   | CAT                           | toaddresstheseissues. |          |        | Inpartic-  |     |     |     |     |     |     |     |
| ular,    | we first                      | devise                | a tacker | model, | distilled  |     |     |     |     |     |     |     |
fromGPT4-turbo,toadoptContextTracking
thatdynamicallyupdatesalistofkeyphrases
| turn | by turn, | as accurate |     | candidates | for ellip- |     |     |     |     |     |     |     |
| ---- | -------- | ----------- | --- | ---------- | ---------- | --- | --- | --- | --- | --- | --- | --- |
sis and coreference resolution. Second, we Figure1: AnexampleofIURinaproductconsulting
furtherpresenttheDynamicContextIntroduc- and sales scenario. Within, green denotes the user’s
|                                        |           |     |        |            |           |     | input,                 | whilebluesignifiesthesalesperson’s. |     |     |     | Thefull |
| -------------------------------------- | --------- | --- | ------ | ---------- | --------- | --- | ---------------------- | ----------------------------------- | --- | --- | --- | ------- |
| tion                                   | mechanism | to  | filter | irrelevant | preceding |     |                        |                                     |     |     |     |         |
| contextsthatarenotreliedonbyanyelement |           |     |        |            |           |     | dialogueisupon35turns. |                                     |     |     |     |         |
withinthekeyphraselisttocondenseextended
2022;OpenAI,2023)andbreakthroughsinmulti-
| dialogues. |     | Comprehensive |     | experiments | indi- |     |     |     |     |     |     |     |
| ---------- | --- | ------------- | --- | ----------- | ----- | --- | --- | --- | --- | --- | --- | --- |
cate that our solution provides a significant turndialogue-orientedtasks,IURhasreceivedin-
improvementovertheexistingbaselines,and creasingattentioninrecentyears.
achievesstate-of-the-artonthreebenchmarks1. In contrast to the brief (in less than 10 turns
onaverage)andsimple(usuallycenteringaround
1 Introduction
|     |     |     |     |     |     |     | a   | single topic) | dialogue | observed |     | between users |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------- | -------- | -------- | --- | ------------- |
andsystems,whichisprimarilyfocusedonbycur-
| Incomplete | Utterance |     | Rewriting |     | (IUR) serves | as  |      |     |            |        |           |           |
| ---------- | --------- | --- | --------- | --- | ------------ | --- | ---- | --- | ---------- | ------ | --------- | --------- |
|            |           |     |           |     |              |     | rent | IUR | researches | as the | benchmark | (Elgohary |
avitalcomponentinmulti-turndialoguesystems,
etal.,2019;Suetal.,2019;Panetal.,2019;Regan
whichreconstructthecurrentutterancebyintegrat-
etal.,2019;Martinetal.,2020),customerservice
ingtheomittedinformationandresolvingcorefer-
andsalesscenariosoftenentailmorecomplexdia-
| ence based | on  | the context |     | to ensure | its complete- |     |     |     |     |     |     |     |
| ---------- | --- | ----------- | --- | --------- | ------------- | --- | --- | --- | --- | --- | --- | --- |
loguesbetweenusersandsalespersons,asshown
ness. Currently,IURiswidelyemployedinpreva-
|     |     |     |     |     |     |     | in  | Figure | 1. These | scenarios | present | two princi- |
| --- | --- | --- | --- | --- | --- | --- | --- | ------ | -------- | --------- | ------- | ----------- |
lenttaskssuchasinformationretrieving(Lietal.,
|     |     |     |     |     |     |     | palchallenges: |     | a)complexellipsisandcoreference |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | -------------- | --- | ------------------------------- | --- | --- | --- |
2022b;Moetal.,2023),questionanswering(Vaku-
problemsdeliveredbythediversedialoguecontent
| lenko et                     | al., 2021), |     | and web | searching | (Li           | et al., |            |     |                                  |     |     |     |
| ---------------------------- | ----------- | --- | ------- | --------- | ------------- | ------- | ---------- | --- | -------------------------------- | --- | --- | --- |
|                              |             |     |         |           |               |         | andtopics. |     | Forinstance,accordingtothedemand |     |     |     |
| 2022a;Mohankumaretal.,2023). |             |     |         |           | Withtheadvent |         |            |     |                                  |     |     |     |
forreimbursement,severalinsuranceproductsare
oflargelanguagemodels(LLMs)(Ouyangetal.,
|     |     |     |     |     |     |     | mentioned |     | throughout | the | dialogues, | which may |
| --- | --- | --- | --- | --- | --- | --- | --------- | --- | ---------- | --- | ---------- | --------- |
1https://github.com/ygxw0909/CaT lead to confusion in figuring out which product
2138
FindingsoftheAssociationforComputationalLinguistics:ACL2024,pages2138–2148
August11-16,2024©2024AssociationforComputationalLinguistics

is the user inquiring about. b) extended turns, at maldependencycontextisobtainedbyfilteringout
times,reachingupwardsofhundreds,encompass- the part preceding the furthest turn tagged in the
ingmultipledistincttopics. Withinthedialoguein keyphraseslist. Ultimately,therewritertakesthe
Figure1,thetopictransitionsfromconsultingthe current utterance, kp list, as well as the minimal
function of medical insurance to recommending dependencycontextasinputtogeneratethefinal
variousproductsforpurchase. completeutterance. Tofullyevaluateourproposed
Someoftheexistingmethods(Liuetal.,2020; CAT,wecollecttherealdialoguesbetweenusers
Duetal.,2023;Lietal.,2023a)applycrossatten- and salespersons from our platform with manual
tionbetweenthecurrentutteranceanditscontext annotationandconstructanewchallengingbench-
togaintherewritingmatrix,usingitfortoken-level mark INSQR. Experimental results across three
actions (such as insertion, deletion, etc.). How- datasetsprovetheeffectivenessofourmethod.
ever,thesemethodsarelimitedtocopyingtokens Ourcontributionsaresummarizedasfollows:
| from the | context, | lack | the flexibility |     | for | modifi- |      |         |         |            |           |     |
| -------- | -------- | ---- | --------------- | --- | --- | ------- | ---- | ------- | ------- | ---------- | --------- | --- |
|          |          |      |                 |     |     |         | • We | propose | a novel | Incomplete | Utterance |     |
cations, and also struggle with lengthy contexts. Rewritingmethod,whichequipsatrackerto
Meanwhile,manyothermethods(Haoetal.,2021; maintain a key-phrases list for ellipsis and
| Xu et al., | 2020; | Jin et | al., 2022) | decompose |     | the |     |     |     |     |     |     |
| ---------- | ----- | ------ | ---------- | --------- | --- | --- | --- | --- | --- | --- | --- | --- |
coreferenceresolution,andarewritertogen-
rewritingtaskintoactionpredictionandspanpre- eratethecompleteutterance.
diction, performing sequence tagging for action • WedesigntheDynamicContextIntroduction
selectionineachtokenofthecurrentutteranceand mechanismtofilterouttheirrelevantcontext
| predicting | candidate | spans      | in      | the context. |           | These |          |     |        |              |            |     |
| ---------- | --------- | ---------- | ------- | ------------ | --------- | ----- | -------- | --- | ------ | ------------ | ---------- | --- |
|            |           |            |         |              |           |       | in order | to  | handle | the extended | multi-turn |     |
| methods    | do not    | adequately | address |              | the issue | of    |          |     |        |              |            |     |
dialogue,whichfurtherenhancestheperfor-
ellipsisandcoreferenceresolutionamongvarious manceoftheRewriter.
| similarcandidates. |     | (Inoueetal.,2022)jointlyop- |         |     |            |     |       |        |          |                  |     |         |
| ------------------ | --- | --------------------------- | ------- | --- | ---------- | --- | ----- | ------ | -------- | ---------------- | --- | ------- |
|                    |     |                             |         |     |            |     | • Our | method | achieves | state-of-the-art |     | results |
| timizes important  |     | tokens                      | picking | and | generative |     |       |        |          |                  |     |         |
onallthreeIURbenchmarks,obtainingsignif-
utterancesrewriting,butthedesignofthepickeris
icantimprovementscomparedtotheexisting
| toostraightforwardandstillignoresthechallenges. |        |             |                |                |          |     | methods.        |          |            |           |           |      |
| ----------------------------------------------- | ------ | ----------- | -------------- | -------------- | -------- | --- | --------------- | -------- | ---------- | --------- | --------- | ---- |
| To handle                                       | the    | challenges, | this           | paper          | proposes |     |                 |          |            |           |           |      |
| a novel                                         | method | called      | CAT            | (Context-Aware |          |     | 2 Preliminaries |          |            |           |           |      |
| Tracking                                        | and    | Dynamic     | Introduction), |                | adopting |     |                 |          |            |           |           |      |
|                                                 |        |             |                |                |          |     | Given a         | dialogue | context    | = C       | ,C ,...,C |      |
| ContextTracking(CT)andDynamicContextIntro-      |        |             |                |                |          |     |                 |          |            | 1         | 2         |      |
|                                                 |        |             |                |                |          |     |                 |          |            | C {       |           | |C|} |
|                                                 |        |             |                |                |          |     | and a following |          | incomplete | utterance |           | U =  |
duction(DCI)forresolveellipsisandcoreference,
|     |     |     |     |     |     |     | u ,u ,...,u |     | ,whereC | = c ,c | ,...,c | is  |
| --- | --- | --- | --- | --- | --- | --- | ----------- | --- | ------- | ------ | ------ | --- |
and requisite irrelevant context filtering: 1) Con- { 1 2 U |} i { 1 2 Ci|}
|               |     |                                  |     |         |           |     | theutteranceofthei-thturn,u | |   |                        | andc |             | |   |
| ------------- | --- | -------------------------------- | --- | ------- | --------- | --- | --------------------------- | --- | ---------------------- | ---- | ----------- | --- |
|               |     |                                  |     |         |           |     |                             |     |                        | j    | k aretheto- |     |
| textTracking. |     | Tofacilitateeffectivetrackingand |     |         |           |     |                             |     |                        |      |             |     |
|               |     |                                  |     |         |           |     | kensoftheutterance.         |     | ThegoalofIURistolearna |      |             |     |
| extracting    | the | key content                      | of  | complex | dialogues |     |                             |     |                        |      |             |     |
mappingfunction,
thatthecurrentutterancedependson,weleverage
atrainabletrackerandproposeContextTrackingto
|                                               |     |     |     |                 |     |     |         |         | U = f(     | ,U, ), |            | (1) |
| --------------------------------------------- | --- | --- | --- | --------------- | --- | --- | ------- | ------- | ---------- | ------ | ---------- | --- |
| perpetuallymaintainakey-phraselist(kplist)for |     |     |     |                 |     |     |         |         | ∗          | M C    |            |     |
| ellipsisandcoreferenceresolution.             |     |     |     | Specifically,an |     |     |         |         |            |        |            |     |
|                                               |     |     |     |                 |     |     | where U | denotes | a complete | and    | standalone | ut- |
∗
emptykplistisinitializedatfirst,asthedialogue
|     |     |     |     |     |     |     | terance resolving |     | ellipsis | and coreference |     | for U, |
| --- | --- | --- | --- | --- | --- | --- | ----------------- | --- | -------- | --------------- | --- | ------ |
advances,thetrackerdynamicallyupdatesthekp
|                 |     |                    |     |     |           |     | denotesthetrainablemodelparameters.     |     |     |     |     | Note |
| --------------- | --- | ------------------ | --- | --- | --------- | --- | --------------------------------------- | --- | --- | --- | --- | ---- |
| listturnbyturn. |     | Theupdatesinclude: |     |     | a)addwhen |     | M                                       |     |     |     |     |      |
|                 |     |                    |     |     |           |     | thatthetextualcontentnewlyintroducedinU |     |     |     |     | is   |
∗
| new key | phrases | occur. | b) delete | when | the | topic |     |     |     |     |     |     |
| ------- | ------- | ------ | --------- | ---- | --- | ----- | --- | --- | --- | --- | --- | --- |
notrequiredtomaintainstrictcongruencewiththe
shiftsandkeyphrasesarenotdependentanymore. textappearingin ,andmodificationisallowedto
| c)reservewhenthepreviouskeyphrasesmaystill |     |     |     |     |     |     |     |     | C   |     |     |     |
| ------------------------------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
ensuresemanticcoherence.
| be mentioned.                                |     | 2) Dynamic |     | Context | Introduc- |     |               |     |     |     |     |     |
| -------------------------------------------- | --- | ---------- | --- | ------- | --------- | --- | ------------- | --- | --- | --- | --- | --- |
| tion. Inordertofurtherfilterouttheturnswhich |     |            |     |         |           |     | 3 Methodology |     |     |     |     |     |
irrelevanttothecurrentutterance,whileensuring
|     |     |     |     |     |     |     | 3.1 Overview |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------------ | --- | --- | --- | --- | --- |
thecontextualintegrityrequiredforrewriting,the
Dynamic Context Introduction mechanism is ap- Figure 2 illustrates the overview of our proposed
plied. Upontheupdateofthekeyphraseslist,each CAT, which wraps a generative rewriter with
R
key phrase is tagged with the index of the most acontexttracker . Thetracker adoptsCTby
|     |     |     |     |     |     |     |     |     | T   | T   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
recentturnitismentioned. Basedonthat,themini- maintainingakeyphraselist(kplist) turnbyturn.
K
2139

Figure2: AnoverviewofCAT.Initially,atrackerdistilledfromGPT4-turboconductsCTtogenerateakeyphrase
list for each turn in the input context. Then, the DCI mechanism is utilized to obtain the minimal dependency
context. Consequently,therewritertakesoverthemcombinedwiththeincompleteutterance,andperformsrewriting
tooutputthecompleteutterance.
|                |     |     | ki,ki,...,k | ,whereki |     |                            |     |     |     |     |             |     |
| -------------- | --- | --- | ----------- | -------- | --- | -------------------------- | --- | --- | --- | --- | ----------- | --- |
| Atthei-thturn, |     |     | =           |          |     | dynamicallymaintainakplist |     |     |     |     | turnbyturn. |     |
|                |     | K i | { 1 2       | |Ki|}    | j   |                            |     |     |     | K   |             |     |
isakeyphrasementionedinthepreviouscontext Inparticular,thekplistisfirstinitializedasan
or the current utterance which can be referred to emptylist,denotedas . Ineachturnofthedia-
0
K
bytheongoingdialoguetopicandcontent. Mean- logues, ispredictedbaseonthelastkplist ,
|     |     |     |     |     |     |     | K i |     |     |     |     | K− i 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------ |
while,contrarytotheexistingmethodsthatinput thecurrentutteranceU i ,andthelimitedprevious
thewholecontext intotherewriterwhileignoring context ,denotedas
CiT
C
| thescenarioswhere                          |     |     | isparticularlyverbose, |     | we  |     |     |     |       |      |     |     |
| ------------------------------------------ | --- | --- | ---------------------- | --- | --- | --- | --- | --- | ----- | ---- | --- | --- |
|                                            |     |     | C                      |     |     |     |     | =   | (     | ,U , | ),  | (2) |
| proposedaDCImechanismtofiltertheirrelevant |     |     |                        |     |     |     |     | i   | i     | 1 i  | CiT |     |
|                                            |     |     |                        |     |     |     |     | K   | T K − |      |     |     |
Atthei-thturn,
contextbaseonthelatestkplist.
|                                             |     |     |     |     |     | where |     | =   | C ,C | ,...,C |     | }, j = |
| ------------------------------------------- | --- | --- | --- | --- | --- | ----- | --- | --- | ---- | ------ | --- | ------ |
| theinputminimaldependencycontextisdenotedas |     |     |     |     |     |       | CiT |     | { j  | j+1    | i 1 |        |
−
|     |       |     |               |     |            | max(1,i |     | γ),γ isahyper-parameter. |                 |     |     | Thenewly |
| --- | ----- | --- | ------------- | --- | ---------- | ------- | --- | ------------------------ | --------------- | --- | --- | -------- |
| m i | n = C | , C | , . .. , C ,m | i 1 | , w h e re |         | −   |                          |                 |     |     |          |
| C i | { m   | m + | 1 i 1 }       | ≤ − |            | isedite |     | dfrom                    | bytheseactions: |     |     |          |
|     |       |     | −             |     |            | i       |     |                          | i 1             |     |     |          |
m i s th e fu r th e st tu r n t h a t th e k p list ha s de p e nd e n t. K K −
|     |     |     |     |     |     | •   | add: | insertanewlyoccurringkey-phrase |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---- | ------------------------------- | --- | --- | --- | --- |
Eventually,therewriterperformsIURbasedonthe
|     |     |     |     |     |     | •   | r e s er | v e : r e t a i | n k i 1 |     | ,whilek | i 1 may |
| --- | --- | --- | --- | --- | --- | --- | -------- | --------------- | ------- | --- | ------- | ------- |
k p l i s t of la s t t u r n , th e m in i m a l d e p e n d e n c y j − i 1 j −
|      |         |         | i 1                  |                  |              |     |           |                 |        | ∈ K − |     |     |
| ---- | ------- | ------- | -------------------- | ---------------- | ------------ | --- | --------- | --------------- | ------ | ----- | --- | --- |
|      | m i n   |         | K −                  |                  |              |     | st i ll b | e r e f e r r e | d to . |       |     |     |
| co n | t e x t | , c o m | b in e d w i th th e | c u rr e n t u t | te r a n c e |     |           |                 |        |       |     |     |
|      | C i     |         |                      |                  |              |     |           |                 | i 1    |       |     | i 1 |
U to ob ta in the rewritten complete utterance U . • delete: remove k − , while k − is
| i   |     |     |     |     | i∗  |     |     |     | j   | ∈ K | i 1 | j   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
−
Inaddition,WeleverageLLMandin-contextlearn- notrelatedtothecurrenttopicorcontent.
|     |     |     |     |     |     | Theupdateprocesspersistsacrosseachturn. |     |     |     |     |     | For |
| --- | --- | --- | --- | --- | --- | --------------------------------------- | --- | --- | --- | --- | --- | --- |
ingtogenerateweaklysupervisedlabels,thereby
instance,inFigure2,"medicalinsurance"isadded
enablingthetrainingofthetrackerandgainingthe
capabilitiesofCTbyLLMdistillation. to mentioned in C , due to its relevance to
|     |     |     |     |     |     | K        | 2        |              | 2         |     |                  |           |
| --- | --- | --- | --- | --- | --- | -------- | -------- | ------------ | --------- | --- | ---------------- | --------- |
|     |     |     |     |     |     | the      | dialogue | topic.       | Beginning |     | from the         | i-th, the |
|     |     |     |     |     |     | customer |          | consistently | consults  |     | about reimbursed |           |
3.2 TrackerforCT
"generaloutpatientdiagnosticandtreatmentcosts",
Themostcommonway(Liuetal.,2020;Haoetal., soitisreservedpersistentinthekplist. Meanwhile,
2021;Jinetal.,2022;Inoueetal.,2022;Lietal., asthesalespersonconsistentlyrecommendsdiffer-
2023a)toaddressellipsisandcoreferenceresolu- entinsuranceproducts,theuser’sfocusshiftsfrom
tionistodirectlypredictthecorrespondingphrases one insurance product to another, such as from
fromthecontext forIUR,whichistoostraightfor- "HealthyFortune: LifetimeCriticalInsurance"to
C
wardtosolvethechallengeproposedinSection1 "MedicalExcellenceOutpatientZeroDeductible",
Thus,wedesignCTthatleveragesatracker to andtheoldonethatprobablyisnotbementioned
T
2140

intheafterdialogueisremovedwhilethenewone thelatterappearsinthen-thturn. Sotheminimal
is added accordingly. Ultimately, the updated kp dependencycontextforrewritingisC .
n 2:n
−
listatthen-thturnservesastheinputforrewriting Thereasonweemployfuzzymatchingandindex
theincompleteutteranceinthe(n+1)-thturn. recordinginsteadofdirectlyrequiringthetracker
T
In light of the diversity of expressions for the topredicttheactionof ’supdatingisthatintegrat-
K
same subject in the context, we utilize a genera- ingthepredictionofthekplistandactionwould
tive way instead of span extraction. We employ increasethedecodingcomplexityfortherewriter.
T5(Raffeletal.,2020)asthe , totakeoverthe Furthermore,itwouldsignificantlydiminishtheac-
T
task instruction combined with ( ,U , ) to curacyofGPT4-turboduringzero-shotpredictions,
K
i
−
1 i CiT
createinputprompts,andrequiretheoutputof whichisintroducedinthenextsubsection.
i
K
inapredefinedstructuredformat Duringrewriting,wepromptthetaskinstruction
combinedwiththecurrentincompleteutteranceU ,
i
<bos>x kp ,x kp ,...,x kp ,<sep>,x kp , theminimaldependencycontext min,andthekp
1,1 1,2 1,
|
k1
|
2,1
(3) list predictedinlastturnas
C
in
i
put. Whilethe
x kp ,...,x kp ,<sep>,...,x kp ,<eos>, K i − 1
2,2 2,k2 ,k rewriter directlygeneratetherewrittencomplete
| | |K|| |K|| R
utterance,asfollow
where<bos>and<eos>denotesthebeginningand
theendofthedecoding, <sep>istheseparateto- U i∗ = R (U i , Ci min, K i − 1 ), (4)
kp
kensandx isthej-thtokenofk .
i,j i where i 1 providesprecisecandidatesforellip-
sis and K co − reference resolution, and min offers a
3.3 RewriterEquippedwithDCI
Ci
minimalcontextforcomprehendingthetopicand
Existingwork(Inoueetal.,2022;Lietal.,2023b) maincontentofthedialogue. Consequently,amore
has proved the efficiency of generative methods semanticallyaccurateandcompleteU isattained.
i∗
for IUR, hence, we also employ T5 as the back-
3.4 WeaklySupervisedLearningviaLLM
bone for the rewriter . To handle the extended
R Distillation
dialogues,wedesignaDCImechanismtodynami-
callytruncatetheirrelevantprecedingturns,instead LLMsrecentlydistinguishthemselvesduetotheir
offeedingtheentirecontextintothemodel. potent generalization capabilities and robustness,
Inbrief,theDCImechanismiterativelyrecords showinggreatzero-shotperformanceondifferent
index = I ,I ,...,I forkplist ,whichde- tasks. Meanwhile, in-context learning (ICL), as
1 2
notest I hecl { osestturnth |K at |} eachkeyph K raseismen- a method within the prompt construction, is be-
tioned. In i-thturn, theindexIi ofki ingwidelyadopted. Itfacilitatesthemodel’stask
j ∈ I i j ∈ K i
isobtainedbythefollowingway: 1)Ifki ismen- understanding by providing representative input-
j
tioned in C and does not exist in , it means outputexamplesindicativeofthecurrenttask,in-
i i 1
that ki is a newly added key phras K e, − thus Ii = i. cludedintheprompt. Tosolvetheproblemoflack-
j j
2)Ifk j i isnotmentionedinC i butexistsin K i − 1 , i r n ew g r l i a t b in e g le u d tt d e a r t a a nc fo e r c t a r n ai b n e in u g se T d s to in e c n e s o u n re ly fa g i o rn ld e e ss n ,
itsignifiesthatki isareservedkeyphrase,hence
j we leverage GPT4-turbo combined with ICL to
Ii = Ii 1, where ki 1 and ki 1 == ki.
j n− n− ∈ K i − 1 n− j obtainweaklysupervisedlabels.
3)Ifki ismentionedinC andalsoexistsin ,
j i K i − 1 Specifically,foreachdataset ,weselectτ rep-
this denotes that ki need to update the recorded D
j resentative examples of dialogue context as the
i k n j i d i e s x m , t e h n e ti r o e n fo e r d e in I j i C = i ,w i. e H pe e r r f e o , rm to s j l u id d i g n e g w w h in e d th o e w r I I C n L ord se e t r , t d o e m no a t k e e d s a u s re D t i h cl at = the {C sa 1 ic m l, p C l 2 e ic d l, c .. o ., n C te τ ic x l t } s .
matching on ki and C with a window size ki , are emblematic and have substantial distinctions
j i | j|
usingLevenshteindistancetocomputesimilarity, amongst each other, we choose them relying on
andselectingthemaximumscoreasthesimilarity manyfactors,suchasthenumberofdialogueturns,
scoresi. Ifsi δ, thenweconsideredthatki is the topics, the complexity of the content, and so
j j ≥ j
mentionedC ,whereδ isahyper-parameter. After on. Wemanuallyannotatetheselimitedexamples
i
theiterativelyrecording,in(i+1)-thturn,themin- as ˆicl = ( icl,Kˆ ),( icl,Kˆ ),...,( icl,Kˆ ) ,
D { C1 1 C2 2 Cτ τ }
imal dependency context is gained as C where Kˆ = ˆi, ˆi,..., ˆi is a set of anno-
In Figure 2, includes two key phrase m s, in w ( I h i i ) l : e i tatedkpl i istco { r K re 1 sp K on 2 ding K to|Ce i|a } chturnofthecon-
n
K
theformerismentionedinthe(n 2)-thturnand text , and ˆi denotes the labeled kp list in j-th
− C i Kj
2141

ˆicl
turn of the context i . We prompt the incor- Dataset Train Dev Test avgc avgt
|     |     |     | C   |     | D   |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
poratewithexplicittaskinstructionandthe i as ReWriter(Suetal.,2019) 18000 2000 - 3.0 24.2
C
input. Theinferenceisformulatedas Restoration(Panetal.,2019) 116360 3024 2999 4.9 34.4
|     |     |     |     |     |     |     | MuDoCo(Martinetal.,2020) |     |     | 5901 | 691 | 749 | 5.4 41.1 |
| --- | --- | --- | --- | --- | --- | --- | ------------------------ | --- | --- | ---- | --- | --- | -------- |
|     |     |     |     |     |     |     |                          |     |     | 2131 | 271 | 276 | 5.7 46.2 |
CQR(Reganetal.,2019)
K = GPT( ˆicl, ), (5) RD(Elgoharyetal.,2019) 3 1 5 2 6 3 4 3 0 5 5 7 1 9 . 8 9 2 . 9
|               |     | ∗i             |             | i     |         |         | C A N A     |                                     |     |            |       |                 |                   |
| ------------- | --- | -------------- | ----------- | ----- | ------- | ------- | ----------- | ----------------------------------- | --- | ---------- | ----- | --------------- | ----------------- |
|               |     |                |             | D C   |         |         | IN S Q R    |                                     |     | 4 7 3 3    | 5 9 1 | 5 9 3           | 3 0 . 1 6 0 0 . 5 |
| where         | K   | is the results | parsed      | from  | the     | output. |             |                                     |     |            |       |                 |                   |
|               | ∗i  |                |             |       |         |         | Table1:     | ThecomparisonofINSQRwiththeexisting |     |            |       |                 |                   |
| Subsequently, |     | we             | filter some | error | returns | dur-    |             |                                     |     |            |       |                 |                   |
|               |     |                |             |       |         |         | benchmarks. | Here,"avg                           |     | c "and"avg | t     | "denotetheaver- |                   |
ing requesting and obviously wrong result af- ageofturnsandlengthofcontext,separately. Weuse
thethreewiththelongestcontextforexperiments.
| ter    | parsing, | and gain  | the        | weakly  | labeled    | dataset |        |      |       |       |       |       |     |
| ------ | -------- | --------- | ---------- | ------- | ---------- | ------- | ------ | ---- | ----- | ----- | ----- | ----- | --- |
|        | = (      | ,K ),(    | ,K ),...,( |         | ,K         | with    |        |      |       |       |       |       |     |
| ∗      |          | 1 ∗1      | 2 ∗2       |         | ∗          |         |        |      |       |       |       |       |     |
| D      | { C      |           | C          | C| D    | ∗|         | ∗ }     | Subset | 0-10 | 11-20 | 21-30 | 31-40 | 41-50 | 51+ |
| a high | q        | u ality . | A fte r    | that, w | e div |Did | e| each |        |      |       |       |       |       |     |
pair of ( i ,K ∗i ) ∗ into training samples Train 723 774 1429 716 394 697
|     |     | C   | ∈ D |     |     |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
( i ,Ui, , ) for the tracker , as shown Dev 94 91 191 70 54 91
| Kj  | 1 j | CiT,j Ki∗,j |     |     |     |     |     |     |     |     |     |     |     |
| --- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
T
| info | − rmulation2,where |     |       | K . |     |     | Test | 90  | 95  | 189 | 78  |     | 50 91 |
| ---- | ------------------ | --- | ----- | --- | --- | --- | ---- | --- | --- | --- | --- | --- | ----- |
|      |                    |     | Ki∗,j | ∗i  |     |     |      |     |     |     |     |     |       |
∈
| Duringthetrainingprocess,thetracker |     |        |            |          |       | firstly |          |     |              |     |            |     |             |
| ----------------------------------- | --- | ------ | ---------- | -------- | ----- | ------- | -------- | --- | ------------ | --- | ---------- | --- | ----------- |
|                                     |     |        |            |          |       | T       | Table 2: | The | distribution | of  | the number |     | of dialogue |
| performs                            |     | weakly | supervised | learning | based | on      |          |     |              |     |            |     |             |
turnsinINSQR.
theconstructeddataset,todistillthecapabilityof
|                        |     |     |     |                       |     |     | videdinto2131/271/276forTrain/Val/Test. |     |     |     |     |     | Itpro- |
| ---------------------- | --- | --- | --- | --------------------- | --- | --- | --------------------------------------- | --- | --- | --- | --- | --- | ------ |
| GPT4-turboontheCTtask. |     |     |     | Afterthat,therewriter |     |     |                                         |     |     |     |     |     |        |
videsmultiplerewritingutteranceswhileweonly
| is  | trained | with the | of  | each IUR | sample | pre- |     |     |     |     |     |     |     |
| --- | ------- | -------- | --- | -------- | ------ | ---- | --- | --- | --- | --- | --- | --- | --- |
| R   |         |          | K   |          |        |      |     |     |     |     |     |     |     |
usethegoldutteranceformetriccalculation.
| dictedby |     | . Here,wedonotemployjointlearning, |     |     |     |     |     |     |     |     |     |     |     |
| -------- | --- | ---------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
T
sincethegranularityofthetrainingsamplesforthe
EvaluationMetrics
| tracker |     | andrewriter | isnotuniform,whichis |     |     |     |                                            |     |     |     |     |     |     |
| ------- | --- | ----------- | -------------------- | --- | --- | --- | ------------------------------------------ | --- | --- | --- | --- | --- | --- |
|         | T   |             | R                    |     |     |     | Followingthepriorworks,weusethreedifferent |     |     |     |     |     |     |
alsoduetotheconsiderationofefficiency.
metricsforevaluation,includingBLUE-scores(Pa-
|     |     |     |     |     |     |     | pineni | et al., | 2002), | ROUGE-scores |     | (Lin, | 2004), |
| --- | --- | --- | --- | --- | --- | --- | ------ | ------- | ------ | ------------ | --- | ----- | ------ |
4 Experiments
andRestoration-scores(Panetal.,2019).
Datasets
MethodsforComparison
Tocomprehensivelyevaluateourmethod,weused
|     |     |     |     |     |     |     | We compared |     | the proposed |     | method | with | notable |
| --- | --- | --- | --- | --- | --- | --- | ----------- | --- | ------------ | --- | ------ | ---- | ------- |
thefollowingthreedatasetscoveringbothEnglish
IURmethods,includingPtr-Gen(Seeetal.,2017),
| andChinese: |     | 1)INSQRisachallengingChinese |     |     |     |     |          |     |             |     |     |     |             |
| ----------- | --- | ---------------------------- | --- | --- | --- | --- | -------- | --- | ----------- | --- | --- | --- | ----------- |
|             |     |                              |     |     |     |     | RUN (Liu | et  | al., 2020), | SRL | (Xu | et  | al., 2020), |
IURdatasetconstructedbytherealdialoguesbe-
|     |     |     |     |     |     |     | T5 (Raffel | et  | al., 2020), | RaST | (Hao | et  | al., 2021), |
| --- | --- | --- | --- | --- | --- | --- | ---------- | --- | ----------- | ---- | ---- | --- | ----------- |
tweencustomersandsalescollectedfromAlipay2
|     |     |     |     |     |     |     | HCT (Jin | et  | al., 2022), | QUEEN |     | (Si et | al., 2022), |
| --- | --- | --- | --- | --- | --- | --- | -------- | --- | ----------- | ----- | --- | ------ | ----------- |
platform,aswellasthemanualannotationtopro-
|      |          |            |         |     |         |      | JET (Inoue | et     | al., 2022), | Flan-T5 |             | (Chung | et al.,  |
| ---- | -------- | ---------- | ------- | --- | ------- | ---- | ---------- | ------ | ----------- | ------- | ----------- | ------ | -------- |
| vide | the gold | utterance. | Within, | the | longest | dia- |            |        |             |         |             |        |          |
|      |          |            |         |     |         |      | 2022),     | DuReSE | (Jiang      | et      | al., 2023), |        | MGII (Du |
loguescanreach100turns,andtheaverageturns
etal.,2023),MIUR(Lietal.,2023a).
| is about | 30, | which | is much | longer | than | the exist- |     |     |     |     |     |     |     |
| -------- | --- | ----- | ------- | ------ | ---- | ---------- | --- | --- | --- | --- | --- | --- | --- |
ing datasets. The detailed comparison is shown ImplementationDetails
| in Table | 1,  | and Table | 2 shows | the | distribution | of  |            |     |        |            |       |     |          |
| -------- | --- | --------- | ------- | --- | ------------ | --- | ---------- | --- | ------ | ---------- | ----- | --- | -------- |
|          |     |           |         |     |              |     | Our method |     | ran on | Tesla A100 | GPUs. |     | Both En- |
the number of turns. The dataset is divided into glishandChineseversionsofT5-baseareusedas
4733/591/593forTrain/Val/Test. 2)CANARD(El- the backbone of CAT for evaluation. The hyper-
goharyetal.,2019)isarepresentativeEnglishIUR parametersintheexperimentsweresetasfollows:
| dataset | derived | by  | QuAC | (Choi et | al., 2018), | an  |     |     |     |     |     |     |     |
| ------- | ------- | --- | ---- | -------- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- |
(1)Thebatchsizeandthelearningrateweresetto
open-domain conversational question answering 16and2e-5(2)Thebeamsearchsizeofdecoding
dataset about specific Wikipedia sections, while was set to 8 (3) The number of the limited turns
CANARDrewritestheoriginallyincompleteques-
|     |     |     |     |     |     |     | ofthecontextγ |     | forthetrackerissetto10(4)The |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------------- | --- | ---------------------------- | --- | --- | --- | --- |
tionsinQuAC.Itcontains31526/3430/5571inthe threshold δ for similarity score was set to 0.8 (5)
Train/Val/Testsetforevaluation. 3)CQR(Regan The number of the examples τ for ICL was set
et al., 2019) is an English IUR dataset extended to5(6)Themaximumlengthofinputandoutput
fromtask-orienteddialogue(Ericetal.,2017)be-
|     |     |     |     |     |     |     | weresetto512. |     | Alltheexperimentalresultswere |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------------- | --- | ----------------------------- | --- | --- | --- | --- |
tweendriversandanin-carassistant,whichisdi- repeated3timesandaveraged.3
2https://www.alipay.com/ 3ThepromptofdistillationisshownintheGithubpage.
2142

|         |     | INSQR |          |       |     | CQR   |       |     |
| ------- | --- | ----- | -------- | ----- | --- | ----- | ----- | --- |
| methods | B1  | B2 B4 | R1 R2 F1 | F2 B1 | B2  | B4 R1 | R2 F1 | F2  |
RUN 72.6 68.8 61.1 81.4 71.2 45.4 34.3 77.4 68.9 53.5 88.0 74.2 - -
HCT 72.8 68.4 61.0 80.9 70.2 - - 79.4 74.8 59.3 88.2 73.2 - -
MIUR 73.3 68.9 61.1 80.9 69.2 44.8 30.6 82.8 76.0 64.0 89.6 74.1 74.8 52.9
| DuReSE | -   | - - | - - | - - 83.3 | 79.1 | 70.4 92.1 | 82.9 | - - |
| ------ | --- | --- | --- | -------- | ---- | --------- | ---- | --- |
T5 73.4 69.8 61.1 82.2 70.3 46.0 36.9 80.8 76.1 67.4 88.1 79.1 73.8 65.0
Flan-T5 75.1 71.4 63.0 86.2 74.7 47.3 38.3 81.6 77.0 68.8 89.2 80.1 75.1 66.9
CAT 78.8 74.7 66.5 89.8 79.9 53.0 43.6 85.4 83.9 80.5 93.7 87.7 77.9 69.5
77.2 72.1 65.0 87.9 76.2 51.1 40.8 84.3 82.4 80.3 91.1 84.2 77.2 68.7
CAT+GPT4
CAT+Gold 89.6 85.7 77.9 97.1 88.6 86.8 73.1 93.4 91.6 87.5 94.8 89.9 84.0 76.9
Table3: OverallresultscomparedwithexistingbaselinesonINSQRandCQR.Here,"B1/2/4"denoteBleu-1/2/4,
"R1/2"indicateRouge-1/2,and"F1/2"representtheF1oftheRestorationscorewith1/2-gram.
|        |           |           |           | sentence.                   | Therefore, | the metrics | such        | as BLEU |
| ------ | --------- | --------- | --------- | --------------------------- | ---------- | ----------- | ----------- | ------- |
| Method | B1 B2     | B4 R1     | R2 RL     |                             |            |             |             |         |
|        |           |           |           | andROUGEremainatahighlevel. |            |             | However,the |         |
| PtrG   | 67.2 60.3 | 50.2 78.9 | 62.9 74.9 |                             |            |             |             |         |
Restorationscorerevealsthedifferenceintheac-
| RUN | 70.5 61.2 | 49.1 79.1 | 61.2 74.7 |     |     |     |     |     |
| --- | --------- | --------- | --------- | --- | --- | --- | --- | --- |
curacyoftheactualmodifiedpart,whereINSQR
| RaST | 53.5 47.6 | 38.1 62.7 | 50.5 61.9 |     |     |     |     |     |
| ---- | --------- | --------- | --------- | --- | --- | --- | --- | --- |
HCT 68.7 62.3 52.1 80.0 66.5 79.4 isobviouslymuchlowerthanCQR,indicatingthat
QUEEN 72.4 65.2 54.4 82.5 68.1 81.8 INSQRpresentsmorecomplexscenarios. Experi-
DuReSE 73.3 65.8 54.7 82.3 66.9 80.6 mentalresultsdemonstratethat,incomparisonto
| MGII | 72.9 63.2 | - 79.2    | - 77.0    |              |           |     |          |          |
| ---- | --------- | --------- | --------- | ------------ | --------- | --- | -------- | -------- |
|      |           |           |           | the backbone | T5 model, | CAT | achieves | a 7% and |
| MIUR | 71.3 63.4 | 51.7 81.6 | 64.5 77.4 |              |           |     |          |          |
4.1%promotioninRestorationscore,respectively,
JET 78.8 72.0 - 84.3 71.1 - which prove the accurate providing and irrele-
K
T5 77.1 70.7 60.1 81.9 69.8 79.6 vantcontextfiltering,caneffectivelyimprovethe
| Flan-T5 | 77.9 71.4 | 60.9 82.5 | 70.5 80.6 |     |     |     |     |     |
| ------- | --------- | --------- | --------- | --- | --- | --- | --- | --- |
performanceofIUR.Meanwhile,thecomparison
CAT 79.7 72.7 62.6 84.9 71.7 81.6 between CAT and CAT+GPT4yieldsaninterest-
CAT+GPT4 79.4 72.7 62.2 84.5 71.5 81.6 ingresultthat,thetracker surprisinglyachieves
T
agreaterenhancementthanGPT4-turboinassist-
Table4: Overallresultscomparedwithexistingbase-
|                                        |     |     |     | ingtherewriter |                 | . weconsiderthereasonisthat |           |            |
| -------------------------------------- | --- | --- | --- | -------------- | --------------- | --------------------------- | --------- | ---------- |
| linesonCANARD.Here,"RL"denotesRouge-L. |     |     |     |                | R               |                             |           |            |
|                                        |     |     |     | the output     | from GPT4-turbo |                             | including | its inher- |
entrandomnessanderrorrateonbothrequestand
4.1 OverallResults
|                                |     |     |             | return, may    | introduce | noise                       | and bias when | it is |
| ------------------------------ | --- | --- | ----------- | -------------- | --------- | --------------------------- | ------------- | ----- |
| Initially,wecompareourproposed |     |     | CAT withthe |                |           |                             |               |       |
|                                |     |     |             | directlyusedas |           | whichalsoservesasthefounda- |               |       |
K
existing methods. To ensure fairness, the pre- tionforDCI.Incontrast,aftertraining, predicts
T
trainedmodel(BERTandT5)equippedbyallthe following its stable task understanding, hence
K
methodsissettothebaseversion. Here,CATde- achieving higher quality. CAT+Gold delineates
notesthemethodproposedinthispaperincluding theupperboundofdatasetmetrics. Itisobservable
thetracker andtherewriter ,CAT+GPT4sig- that, although the current CAT attains a notable
|     | T   | R   |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
nifiesthedirectuseofresults returnedbyGPT4- improvementinINSQRandCQR,thereremainsa
K
turbo,andCAT+Goldindicatestheemploymentof
substantialgaptotheupperbound,especiallythe
goldenphrasesprovidedbythedataset,requiredin Restorationscore. Itagainhighlightsthecomplex-
ellipsisandcoreferenceresolutionduringrewriting. ityinherentinINSQRsincethegapishuge.
Table3andTable4showtheexperimentalresults,
wherein our CAT outperforms the other methods ResultsonCANARD
andachievesstate-of-the-artonallthreedatasets. CANARDpresentsadistinctscenariocomparedto
|     |     |     |     | theabovetwodatasets. |     | Beyondellipsisandcoref- |     |     |
| --- | --- | --- | --- | -------------------- | --- | ----------------------- | --- | --- |
ResultsonINSQRandCQR
|     |     |     |     | erence resolution, |     | it also entails | modifications | to  |
| --- | --- | --- | --- | ------------------ | --- | --------------- | ------------- | --- |
In INSQR and CQR, the main challenges of the the key phrases themselves, and sometimes also
rewriting are ellipsis and coreference resolution, to the rest part of the original sentences. These
while minimally revising the rest of the original modificationslackadefinitiveuniqueness,making
2143

Method B1 B2 R1 R2
CAT 78.8 74.7 89.8 79.9 80
w/oCT 75.2 71.4 84.8 73.5
INSQR
w/oDCI 76.8 72.7 86.4 76.0
70
T5 73.4 69.8 82.2 70.3
CAT 85.4 83.9 93.7 87.7
60
w/oCT 81.6 77.4 89.7 81.2
CQR
w/oDCI 85.4 83.5 92.7 87.9
T5 80.8 76.1 88.1 79.1
0-10 11-30 31-50 51+
CAT 79.7 72.7 84.9 71.7
w/oCT 77.9 71.5 82.9 70.6
CANARD
w/oDCI 78.9 72.2 84.2 71.2
T5 77.1 70.7 81.9 69.8
Table5: Overallablationtestsonthreedatasets.
it challenging for the Restoration score to evalu-
atetheperformance. TheresultsshowninTable4
presentthatthegenerativemethodsoutperformthe
editing-based methods due to their flexibility in
conformingtothevariousmodificationspresentin
the labels. CAT further delivers an improvement
overexistingmethods. Within,JETalsoemploys
a picker for directly acquiring referential candi-
datephrasesfromtheentireprecedingcontext. In
contrast, our proposed CT decomposes the com-
plexity of prediction into each turn, maintaining
a more precise , combined with a brief context
K
min providedbyDCI,therebyachievingsuperior
C
performanceonIUR.Duringthedistillation,GPT4-
turboexhibitsamorestablepredictiveperformance
onCANARDbecauseallthedialoguesareabout
Wikipedia,sotheresultsof CATand CAT+GPT4
are close. Here, CANARD does not provide an-
notationsofkeyphrases,hencetheabsenceofthe
CAT+Goldsetting.
4.2 AblationTests
To evaluate the contributions of each component
ofCAT,theablationtestisconstructed. Here,we
considerthefollowingsettings
• w/oCT:Removing andrewritingwithout
T
, while min is obtained by directly adopt
K C
DCIonthepredictionofGPT4-turbo.
• w/oDCI:RemovingtheDCIwhileinputting
theentire toR.
C
TheresultsareshowninTable5. Onourchallenge
datasetINSQR,bothCTandDCIdemonstratesig-
nificantimprovement,whichshowstheeffective-
nessof CAT tohandlethescenariowithconfusing
ellipsis and coreference resolution and extended
2-uelB
T5
w/oCT
w/oDCI
CAT
90
80
70
60
0-10 11-30 31-50 51+
2-eguoR
T5
w/oCT
w/oDCI
CAT
Figure 3: Detailed ablation tests of four subsets with
differentnumbersofturns.
context. In the case of CQR, which primarily fo-
cuses on ellipsis and coreference resolution with
shortcontext,CTplaysapivotalrole,whiletheim-
pactofDCIislesspronounced. Meanwhile,both
CT and DCI also exhibit a certain improvement
inCANARDwhilethegoldrewritinglabelswith
non-uniqueexpressionsconstrainstheperformance
ofthecomponents.
4.3 TheImpactofContextTurns
For a detailed analysis of the efficacy of our pro-
posed methods when dealing with the extended
dialoguesofvaryingturnandcomplexity,weparti-
tionedtheINSQRtestsetintofoursubsetsbased
on the number of turns: 0-10, 11-30, 31-50, and
51+(withthemaximumbeing100turns). Wethen
evaluatethescoreofBleu-2andRouge-2onthese
subsets, employing the same settings used in the
ablation tests. The results are shown in Figure 3.
With the increase in the number of turns, the im-
provementofCAToverthebackboneT5isprogres-
sivelyamplified,whichprovestheeffectivenessof
CAT inhandlingcomplexandextendeddialogues.
CTconsistentlydelivershighcontributionsacross
allthesubsetswithvariouslengths,demonstrating
that accurate can steadily improve the perfor-
K
manceofellipsisandcoreferenceresolutionduring
rewriting. Meanwhile, when the context is brief
withfewerturns,particularlywithin10turns,the
2144

Method P R F1 utterance to adjudicate on a token-level whether
insertionorreplacementoperationsshouldbecar-
|     | GPT4-turbo |     | 50.7 | 68.4 | 58.2 |           |     |        |            |                |     |     |
| --- | ---------- | --- | ---- | ---- | ---- | --------- | --- | ------ | ---------- | -------------- | --- | --- |
|     |            |     |      |      |      | ried out. | SRL | (Xu et | al., 2020) | pre-identifies |     | the |
INSQR
|     | Tracker |     | 57.2 | 64.4 | 60.6 |           |         |     |              |     |            |     |
| --- | ------- | --- | ---- | ---- | ---- | --------- | ------- | --- | ------------ | --- | ---------- | --- |
|     |         |     |      |      |      | candidate | lexicon | for | the subject, |     | predicate, | and |
GPT4-turbo 55.2 76.1 64.0 object within the context, and incorporates these
CQR
|     |         |     |      | 70.1 |      | as extra         | features | into | the encoder |         | to achieve | bet-   |
| --- | ------- | --- | ---- | ---- | ---- | ---------------- | -------- | ---- | ----------- | ------- | ---------- | ------ |
|     | Tracker |     | 61.6 |      | 65.6 |                  |          |      |             |         |            |        |
|     |         |     |      |      |      | ter performance. |          | RaST | (Hao        | et al., | 2021)      | formu- |
Table6: TheresultsofCT.Here,P,R,andF1denote latestheIURassequencelabeling,effectuatingthe
precisionscore,recallscore,andF1score. rewrite by predicting actions (insertion, deletion,
andNone)andthespansofthecontextseparately.
| enhancementbroughtbyDCIisslight. |     |     |     |     | However, |     |     |     |     |     |     |     |
| -------------------------------- | --- | --- | --- | --- | -------- | --- | --- | --- | --- | --- | --- | --- |
HCT(Jinetal.,2022)enhancestheactionpredictor
aftertheincreaseindialogues(31-50and50+),the
ofthepreviousworktoarulepredictor,optimizing
demandforfiltrationofirrelevantcontextisampli-
|     |     |     |     |     |     | for the | generation | of  | modified | words | not | exactly |
| --- | --- | --- | --- | --- | --- | ------- | ---------- | --- | -------- | ----- | --- | ------- |
fied,therebythecontributionofDCIishighlighted.
|     |     |     |     |     |     | present | in the | context. | QUEEN |     | (Si et | al., 2022) |
| --- | --- | --- | --- | --- | --- | ------- | ------ | -------- | ----- | --- | ------ | ---------- |
.
|     |     |     |     |     |     | proposed | a query | template |     | that | explicitly | brings |
| --- | --- | --- | --- | --- | --- | -------- | ------- | -------- | --- | ---- | ---------- | ------ |
guidedsemanticstructuralknowledgebetweenthe
4.4 PerformanceonCT
|             |             |            |         |              |         | incomplete | utterance |            | and the | rewritten |     | utterance. |
| ----------- | ----------- | ---------- | ------- | ------------ | ------- | ---------- | --------- | ---------- | ------- | --------- | --- | ---------- |
| In addition | to          | rewriting, | we      | also conduct | exper-  |            |           |            |         |           |     |            |
|             |             |            |         |              |         | JET(Inoue  | et        | al., 2022) | jointly | optimizes |     | impor-     |
| iments      | to evaluate | the        | results | of CT.       | Herein, | we         |           |            |         |           |     |            |
tanttokenpickingandrewrittenutterancesgener-
| comparethepredictionresultsof |     |     |     | bythetrained |     |               |     |         |        |         |        |        |
| ----------------------------- | --- | --- | --- | ------------ | --- | ------------- | --- | ------- | ------ | ------- | ------ | ------ |
|                               |     |     |     |              |     | ation (Raffel |     | et al., | 2020), | but the | design | of the |
T
withthezero-shotGPT-4-turboonINSQRand
| T         |         |           |        |             |            | picker                     | is too | straightforward |     | to perform         |     | accurate |
| --------- | ------- | --------- | ------ | ----------- | ---------- | -------------------------- | ------ | --------------- | --- | ------------------ | --- | -------- |
| CQR which | both    | provide   | golden | annotations |            | for                        |        |                 |     |                    |     |          |
|           |         |           |        |             |            | recallinextendeddialogues. |        |                 |     | (Lietal.,2023b)em- |     |          |
| the key   | phrases | leveraged | by     | rewriting   | utterance. |                            |        |                 |     |                    |     |          |
ployscontinuedpre-trainingontheT5(Raffeletal.,
| Note that | we only | evaluate |     | the precision, | recall, |     |     |     |     |     |     |     |
| --------- | ------- | -------- | --- | -------------- | ------- | --- | --- | --- | --- | --- | --- | --- |
2020)modeltoenhanceitsperformanceonIUR,
| and F1  | of the         | on the | rewriting | turns | due to | the       |     |            |     |        |             |      |
| ------- | -------------- | ------ | --------- | ----- | ------ | --------- | --- | ---------- | --- | ------ | ----------- | ---- |
|         | T              |        |           |       |        | while (Du | et  | al., 2023) | and | (Li et | al., 2023a) | fur- |
| absence | of annotations |        | for the   | other | turns. | The       |     |            |     |        |             |      |
therdevisefine-grainedsubtasksandrefinedmodel
results,showninTable6indicatethatGPT4-turbo
|     |     |     |     |     |     | architectures |     | based on | the | edit matrix. |     | However, |
| --- | --- | --- | --- | --- | --- | ------------- | --- | -------- | --- | ------------ | --- | -------- |
retainsthegreatcapabilitytoidentifykeyphrases
|          |               |     |           |      |            | the existing | benchmarks |     | targeted |     | by all | the work |
| -------- | ------------- | --- | --------- | ---- | ---------- | ------------ | ---------- | --- | -------- | --- | ------ | -------- |
| assisted | by in-context |     | learning, | thus | performing |              |            |     |          |     |        |          |
referencedabovearelimitedtosimpleellipsisand
| well in | recall. | However, | it  | also tends | to predict |     |     |     |     |     |     |     |
| ------- | ------- | -------- | --- | ---------- | ---------- | --- | --- | --- | --- | --- | --- | --- |
coreferenceproblems,whilenoneofthempayat-
phrasesthatareextraneoustothecoretopic,result-
tentiontothechallengesmentionedinsection1.
| inginalowerprecision. |     |         | Incontrasttothezero-shot |              |     |              |     |     |     |     |     |     |
| --------------------- | --- | ------- | ------------------------ | ------------ | --- | ------------ | --- | --- | --- | --- | --- | --- |
| prediction,           | the | trained | tracker                  | demonstrates |     | a            |     |     |     |     |     |     |
|                       |     |         |                          | T            |     | 6 Conclusion |     |     |     |     |     |     |
deepercomprehensionoftheoveralldatadistribu-
tionandthekeyphrasesrequiredtobeextracted,
|         |           |          |     |             |     | In this | paper, | we presented |     | a novel | method | for |
| ------- | --------- | -------- | --- | ----------- | --- | ------- | ------ | ------------ | --- | ------- | ------ | --- |
| thereby | achieving | a marked |     | improvement | in  | pre-    |        |              |     |         |        |     |
incompleteutterancerewritingamongextendeddi-
cision. Whilethiscomeswithalittledecreasein
alogueswithcomplexcontent,calledCATwhichis
| recall. Nonetheless,overallperformanceof |     |     |     |     |     | re-                                         |     |     |     |     |     |     |
| ---------------------------------------- | --- | --- | --- | --- | --- | ------------------------------------------- | --- | --- | --- | --- | --- | --- |
|                                          |     |     |     |     |     | T acomponentofacontexttrackerandagenerative |     |     |     |     |     |     |
mainsmarginallysuperiortothatofGPT-4-turbo.
|     |     |     |     |     |     | rewriter. | ContextTrackingisadoptedbythetracker |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --------- | ------------------------------------ | --- | --- | --- | --- | --- |
Italsoexplainsthat,asshowninTable3,employ-
tomaintainalistturnbyturn,whichincludesthe
| ingthetrained |     | achievesbetterperformancethan |     |     |     |     |     |     |     |     |     |     |
| ------------- | --- | ----------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
keyphrasementionedinthepreviouscontextthat
T
directlyusingtheoutputsofGPT-4-turbo.
|     |     |     |     |     |     | may still | be  | referred | to in | the current |     | utterance, |
| --- | --- | --- | --- | --- | --- | --------- | --- | -------- | ----- | ----------- | --- | ---------- |
ascandidatestopromotetheperformanceofellip-
5 RelatedWork
|     |     |     |     |     |     | sis and | coreference |     | resolution. | Furthermore, |     | the |
| --- | --- | --- | --- | --- | --- | ------- | ----------- | --- | ----------- | ------------ | --- | --- |
EarlyworksonIURprimarilycombinesequence- DynamicContextIntroductionisdesignedtofilter
to-sequencebasedmodelwithacopymechanism the irrelevant previous turns and retain the mini-
tofetchtherelevantinformationinthecontext(Su maldependencycontextfortherewriter. Extensive
etal.,2019;Elgoharyetal.,2019;KumarandJoshi, experiments indicate that CAT achieves state-of-
2017). Due to the strong representation capabili- the-artresultsonthreebenchmarkscomparedwith
ties of pre-trained models (Devlin et al., 2019), theexistingbaselines. Infuturework,wewillex-
RUN(Liuetal.,2020)introducesarewritingma- pandourworkonawiderrangeofscenarios,and
trix derived from the embedding of context and alsoexploretheoptimizationofthetracker.
2145

7 Limitations rewritequestions-in-context. InProceedingsofthe
|     |     |     |     |     |     |     | 2019 Conference |     | on Empirical |     | Methods | in Natu- |
| --- | --- | --- | --- | --- | --- | --- | --------------- | --- | ------------ | --- | ------- | -------- |
ThispaperproposedanovelIncompleteUtterance ralLanguageProcessingandthe9thInternational
JointConferenceonNaturalLanguageProcessing,
| Rewritingmethod,namely |     |     | CAT,whichprimarily |     |     |     |     |     |     |     |     |     |
| ---------------------- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
focuses on the task in dialogue systems with ex- EMNLP-IJCNLP2019,HongKong,China,Novem-
|        |            |          |     |             |          |     | ber 3-7, | 2019, | pages 5917–5923. |     | Association | for |
| ------ | ---------- | -------- | --- | ----------- | -------- | --- | -------- | ----- | ---------------- | --- | ----------- | --- |
| tended | multi-turn | dialogue |     | and complex | content. |     |          |       |                  |     |             |     |
ComputationalLinguistics.
| Nevertheless, |     | we have | not | combined | IUR | with |     |     |     |     |     |     |
| ------------- | --- | ------- | --- | -------- | --- | ---- | --- | --- | --- | --- | --- | --- |
somedownstreamtaskssuchasrecommendation MihailEric,LakshmiKrishnan,FrançoisCharette,and
|                                          |     |     |     |     |     |       | ChristopherD.Manning.2017.        |     |     |     | Key-valueretrieval |     |
| ---------------------------------------- | --- | --- | --- | --- | --- | ----- | --------------------------------- | --- | --- | --- | ------------------ | --- |
| orquestionansweringforfurtherdiscussion. |     |     |     |     |     | Mean- |                                   |     |     |     |                    |     |
|                                          |     |     |     |     |     |       | networksfortask-orienteddialogue. |     |     |     | InProceedings      |     |
while,thoughthedesignofContextTrackingcan
|     |     |     |     |     |     |     | of the 18th | Annual | SIGdial | Meeting | on  | Discourse |
| --- | --- | --- | --- | --- | --- | --- | ----------- | ------ | ------- | ------- | --- | --------- |
yieldsignificantimprovement,itnecessitatesreal- andDialogue,Saarbrücken,Germany,August15-17,
time computation and prediction as the dialogue 2017,pages37–49.AssociationforComputational
Linguistics.
| moves | on, which | results | in  | substantial | computa- |     |     |     |     |     |     |     |
| ----- | --------- | ------- | --- | ----------- | -------- | --- | --- | --- | --- | --- | --- | --- |
tional resources required in actual scenarios. Si- JieHao,LinfengSong,LiweiWang,KunXu,Zhaopeng
multaneously,theefficacyofthetackerisheavily
|     |     |     |     |     |     |     | Tu,andDongYu.2021. |     |     | RAST:domain-robustdia- |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------------------ | --- | --- | ---------------------- | --- | --- |
contingentuponthequalityofweaklysupervised loguerewritingassequencetagging. InProceedings
|     |     |     |     |     |     |     | of the 2021 | Conference |     | on Empirical | Methods | in  |
| --- | --- | --- | --- | --- | --- | --- | ----------- | ---------- | --- | ------------ | ------- | --- |
labelsobtainedfromtheLLMs.
|     |     |     |     |     |     |     | Natural | Language | Processing, |     | EMNLP | 2021, Vir- |
| --- | --- | --- | --- | --- | --- | --- | ------- | -------- | ----------- | --- | ----- | ---------- |
tualEvent/PuntaCana,DominicanRepublic,7-11
November,2021,pages4913–4924.Associationfor
References
ComputationalLinguistics.
EunsolChoi,HeHe,MohitIyyer,MarkYatskar,Wen-
ShumpeiInoue,TsungweiLiu,SonNguyen,andMinh-
| tauYih,     | YejinChoi, |                                  | PercyLiang, | andLukeZettle- |     |     |                  |     |                            |     |     |     |
| ----------- | ---------- | -------------------------------- | ----------- | -------------- | --- | --- | ---------------- | --- | -------------------------- | --- | --- | --- |
|             |            |                                  |             |                |     |     | TienNguyen.2022. |     | Enhanceincompleteutterance |     |     |     |
| moyer.2018. |            | QuAC:Questionansweringincontext. |             |                |     |     |                  |     |                            |     |     |     |
restorationbyjointlearningtokenextractionandtext
| In Proceedings |     | of  | the 2018 | Conference | on Empiri- |     |             |                                  |     |     |     |     |
| -------------- | --- | --- | -------- | ---------- | ---------- | --- | ----------- | -------------------------------- | --- | --- | --- | --- |
|                |     |     |          |            |            |     | generation. | InProceedingsofthe2022Conference |     |     |     |     |
calMethodsinNaturalLanguageProcessing,pages
oftheNorthAmericanChapteroftheAssociationfor
2174–2184,Brussels,Belgium.AssociationforCom-
|     |     |     |     |     |     |     | ComputationalLinguistics: |     |     | HumanLanguageTech- |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------------------------- | --- | --- | ------------------ | --- | --- |
putationalLinguistics.
nologies,NAACL2022,Seattle,WA,UnitedStates,
July10-15,2022,pages3149–3158.Associationfor
HyungWonChung,LeHou,ShayneLongpre,Barret
ComputationalLinguistics.
Zoph,YiTay,WilliamFedus,EricLi,XuezhiWang,
MostafaDehghani,SiddharthaBrahma,AlbertWeb-
WenhuiJiang,XiaodongGu,YutingChen,andBeijun
| son, | Shixiang | Shane | Gu, Zhuyun | Dai, | Mirac | Suz- |     |     |     |     |     |     |
| ---- | -------- | ----- | ---------- | ---- | ----- | ---- | --- | --- | --- | --- | --- | --- |
gun,XinyunChen,AakankshaChowdhery,Sharan Shen. 2023. Durese: Rewriting incomplete utter-
|     |     |     |     |     |     |     | ancesvianeuralsequenceediting. |     |     |     | NeuralProcess. |     |
| --- | --- | --- | --- | --- | --- | --- | ------------------------------ | --- | --- | --- | -------------- | --- |
Narang,GauravMishra,AdamsYu,VincentY.Zhao,
Lett.,55(7):8713–8730.
YanpingHuang,AndrewM.Dai,HongkunYu,Slav
| Petrov, | EdH.Chi, |     | JeffDean, | JacobDevlin, |     | Adam |     |     |     |     |     |     |
| ------- | -------- | --- | --------- | ------------ | --- | ---- | --- | --- | --- | --- | --- | --- |
LisaJin,LinfengSong,LifengJin,DongYu,andDaniel
| Roberts, | DennyZhou, |     | QuocV.Le, |     | andJasonWei. |     |              |                                     |     |     |     |     |
| -------- | ---------- | --- | --------- | --- | ------------ | --- | ------------ | ----------------------------------- | --- | --- | --- | --- |
|          |            |     |           |     |              |     | Gildea.2022. | Hierarchicalcontexttaggingforutter- |     |     |     |     |
2022. Scalinginstruction-finetunedlanguagemodels.
|     |     |     |     |     |     |     |                 |     | Thirty-Sixth |     | AAAI Conference |     |
| --- | --- | --- | --- | --- | --- | --- | --------------- | --- | ------------ | --- | --------------- | --- |
|     |     |     |     |     |     |     | ance rewriting. |     | In           |     |                 |     |
CoRR,abs/2210.11416.
onArtificialIntelligence,AAAI2022,Thirty-Fourth
Jacob Devlin, Ming-Wei Chang, Kenton Lee, and ConferenceonInnovativeApplicationsofArtificial
|          |            |     |       |       |              |     | Intelligence,  | IAAI | 2022,    | The Twelveth  | Symposium     |     |
| -------- | ---------- | --- | ----- | ----- | ------------ | --- | -------------- | ---- | -------- | ------------- | ------------- | --- |
| Kristina | Toutanova. |     | 2019. | BERT: | pre-training | of  |                |      |          |               |               |     |
|          |            |     |       |       |              |     | on Educational |      | Advances | in Artificial | Intelligence, |     |
deepbidirectionaltransformersforlanguageunder-
|           |                                    |     |     |     |     |     | EAAI 2022 | Virtual | Event, | February | 22 - | March 1, |
| --------- | ---------------------------------- | --- | --- | --- | --- | --- | --------- | ------- | ------ | -------- | ---- | -------- |
| standing. | InProceedingsofthe2019Conferenceof |     |     |     |     |     |           |         |        |          |      |          |
theNorthAmericanChapteroftheAssociationfor 2022,pages10849–10857.AAAIPress.
| ComputationalLinguistics: |     |     |     | HumanLanguageTech- |     |     |                                    |     |     |     |            |     |
| ------------------------- | --- | --- | --- | ------------------ | --- | --- | ---------------------------------- | --- | --- | --- | ---------- | --- |
|                           |     |     |     |                    |     |     | VineetKumarandSachindraJoshi.2017. |     |     |     | Incomplete |     |
nologies,NAACL-HLT2019,Minneapolis,MN,USA,
follow-upquestionresolutionusingretrievalbased
June2-7,2019,Volume1(LongandShortPapers),
|       |            |     |             |     |               |     | sequence | to sequence   | learning. |       | In Proceedings | of  |
| ----- | ---------- | --- | ----------- | --- | ------------- | --- | -------- | ------------- | --------- | ----- | -------------- | --- |
| pages | 4171–4186. |     | Association | for | Computational |     |          |               |           |       |                |     |
|       |            |     |             |     |               |     | the 40th | International | ACM       | SIGIR | Conference     | on  |
Linguistics.
ResearchandDevelopmentinInformationRetrieval,
Haowei Du, Dinghao Zhang, Chen Li, Yang Li, and Shinjuku, Tokyo, Japan, August 7-11, 2017, pages
| Dongyan | Zhao. | 2023. | Multi-granularity |     | informa- |     | 705–714.ACM. |     |     |     |     |     |
| ------- | ----- | ----- | ----------------- | --- | -------- | --- | ------------ | --- | --- | --- | --- | --- |
tioninteractionframeworkforincompleteutterance
JiangLi,XiangdongSu,XinlanMa,andGuanglaiGao.
| rewriting.           | InFindingsoftheAssociationforCompu- |     |                         |     |     |     |                                          |     |                           |     |     |     |
| -------------------- | ----------------------------------- | --- | ----------------------- | --- | --- | --- | ---------------------------------------- | --- | ------------------------- | --- | --- | --- |
|                      |                                     |     |                         |     |     |     | 2023a. HowwellapplysimpleMLPtoincomplete |     |                           |     |     |     |
| tationalLinguistics: |                                     |     | EMNLP2023,Singapore,De- |     |     |     |                                          |     |                           |     |     |     |
|                      |                                     |     |                         |     |     |     | utterancerewriting?                      |     | InProceedingsofthe61stAn- |     |     |     |
cember6-10,2023,pages2576–2581.Association
forComputationalLinguistics. nualMeetingoftheAssociationforComputational
|     |     |     |     |     |     |     | Linguistics | (Volume | 2:  | Short Papers), | ACL | 2023, |
| --- | --- | --- | --- | --- | --- | --- | ----------- | ------- | --- | -------------- | --- | ----- |
AhmedElgohary,DenisPeskov,andJordanL.Boyd- Toronto,Canada,July9-14,2023,pages1567–1576.
Graber. 2019. Can you unpack that? learning to AssociationforComputationalLinguistics.
2146

SenLi,FuyuLv,TaiweiJin,GuiyangLi,YukunZheng, LongOuyang,JeffreyWu,andXuJiang.2022. Training
Tao Zhuang, Qingwen Liu, Xiaoyi Zeng, James T. languagemodelstofollowinstructionswithhuman
Kwok, and Qianli Ma. 2022a. Query rewriting in feedback. InAdvancesinNeuralInformationPro-
Proceedings of the 31st ACM cessingSystems35: AnnualConferenceonNeural
| taobao | search. | In  |     |     |     |     |     |     |     |     |
| ------ | ------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
InternationalConferenceonInformation&Knowl- InformationProcessingSystems2022,NeurIPS2022,
edgeManagement,Atlanta,GA,USA,October17-21, NewOrleans,LA,USA,November28-December9,
| 2022,pages3262–3271.ACM. |     |     |     |     |     | 2022. |     |     |     |     |
| ------------------------ | --- | --- | --- | --- | --- | ----- | --- | --- | --- | --- |
Xiangsheng Li, Jiaxin Mao, Weizhi Ma, Zhijing Wu, Zhufeng Pan, Kun Bai, Yan Wang, Lianqiang Zhou,
YiqunLiu,MinZhang,ShaopingMa,ZhaoweiWang,
|     |     |     |     |     |     | andXiaojiangLiu.2019. |     |     | Improvingopen-domain |     |
| --- | --- | --- | --- | --- | --- | --------------------- | --- | --- | -------------------- | --- |
and Xiuqiang He. 2022b. A cooperative neural dialoguesystemsviamulti-turnincompleteutterance
information retrieval pipeline with knowledge en- restoration. InProceedingsofthe2019Conference
hanced automatic query reformulation. In WSDM on Empirical Methods in Natural Language Pro-
’22: TheFifteenthACMInternationalConferenceon cessingandthe9thInternationalJointConference
WebSearchandDataMining,VirtualEvent/Tempe,
onNaturalLanguageProcessing,EMNLP-IJCNLP
AZ, USA, February 21 - 25, 2022, pages 553–561. 2019,HongKong,China,November3-7,2019,pages
| ACM. |     |     |     |     |     | 1824–1833.AssociationforComputationalLinguis- |     |     |     |     |
| ---- | --- | --- | --- | --- | --- | --------------------------------------------- | --- | --- | --- | --- |
tics.
ZitongLi,JiaweiLi,HaifengTang,KennyQ.Zhu,and
| RuolanYang.2023b. |     | Incompleteutterancerewriting |     |     |     |     |     |     |     |     |
| ----------------- | --- | ---------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
KishorePapineni,SalimRoukos,ToddWard,andWei-
| byAtwo-phaselocate-and-fillregime.         |     |     |     | InFindingsof |     |                            |     |                                 |                    |     |
| ------------------------------------------ | --- | --- | --- | ------------ | --- | -------------------------- | --- | ------------------------------- | ------------------ | --- |
|                                            |     |     |     |              |     | JingZhu.2002.              |     | Bleu: amethodforautomaticevalu- |                    |     |
| theAssociationforComputationalLinguistics: |     |     |     |              | ACL |                            |     |                                 |                    |     |
|                                            |     |     |     |              |     | ationofmachinetranslation. |     |                                 | InProceedingsofthe |     |
2023,Toronto,Canada,July9-14,2023,pages2731– 40thAnnualMeetingoftheAssociationforCompu-
2745.AssociationforComputationalLinguistics. tationalLinguistics,July6-12,2002,Philadelphia,
PA,USA,pages311–318.ACL.
| Chin-Yew                    | Lin. | 2004. ROUGE: |     | A package        | for auto- |     |     |     |     |     |
| --------------------------- | ---- | ------------ | --- | ---------------- | --------- | --- | --- | --- | --- | --- |
| maticevaluationofsummaries. |      |              |     | InTextSummariza- |           |     |     |     |     |     |
ColinRaffel,NoamShazeer,AdamRoberts,Katherine
tionBranchesOut,pages74–81,Barcelona,Spain.
Lee,SharanNarang,MichaelMatena,YanqiZhou,
AssociationforComputationalLinguistics. WeiLi,andPeterJ.Liu.2020. Exploringthelimits
oftransferlearningwithaunifiedtext-to-texttrans-
| Qian Liu, | Bei Chen, | Jian-Guang |     | Lou, Bin | Zhou, and |     |     |     |     |     |
| --------- | --------- | ---------- | --- | -------- | --------- | --- | --- | --- | --- | --- |
former. J.Mach.Learn.Res.,21:140:1–140:67.
| DongmeiZhang.2020.         |     |     | Incompleteutterancerewrit- |                    |     |     |     |     |     |     |
| -------------------------- | --- | --- | -------------------------- | ------------------ | --- | --- | --- | --- | --- | --- |
| ingassemanticsegmentation. |     |     |                            | InProceedingsofthe |     |     |     |     |     |     |
MichaelRegan,PushpendreRastogi,ArpitGupta,and
2020ConferenceonEmpiricalMethodsinNatural
|     |     |     |     |     |     | LambertMathias.2019. |     | Adatasetforresolvingre- |     |     |
| --- | --- | --- | --- | --- | --- | -------------------- | --- | ----------------------- | --- | --- |
LanguageProcessing,EMNLP2020,Online,Novem-
|     |     |     |     |     |     | ferring expressions |     | in spoken | dialogue | via contex- |
| --- | --- | --- | --- | --- | --- | ------------------- | --- | --------- | -------- | ----------- |
ber16-20,2020,pages2846–2857.Associationfor
|     |     |     |     |     |     | tual query | rewrites | (CQR). | arXiv | e-prints, page |
| --- | --- | --- | --- | --- | --- | ---------- | -------- | ------ | ----- | -------------- |
ComputationalLinguistics.
arXiv:1903.11783.
ScottMartin,ShivaniPoddar,andKartikeyaUpasani.
AbigailSee,PeterJ.Liu,andChristopherD.Manning.
| 2020. | Mudoco: | Corpus | for | multidomain | corefer- |                      |     |                           |     |     |
| ----- | ------- | ------ | --- | ----------- | -------- | -------------------- | --- | ------------------------- | --- | --- |
|       |         |        |     |             |          | 2017. Gettothepoint: |     | Summarizationwithpointer- |     |     |
enceresolutionandreferringexpressiongeneration.
Proceedings of The 12th Language Resources generatornetworks. InProceedingsofthe55thAn-
In
nualMeetingoftheAssociationforComputational
andEvaluationConference,LREC2020,Marseille,
Linguistics,ACL2017,Vancouver,Canada,July30-
France,May11-16,2020,pages104–111.European
|     |     |     |     |     |     | August4,Volume1: |     | LongPapers,pages1073–1083. |     |     |
| --- | --- | --- | --- | --- | --- | ---------------- | --- | -------------------------- | --- | --- |
LanguageResourcesAssociation.
AssociationforComputationalLinguistics.
| Fengran Mo, | Kelong | Mao, | Yutao | Zhu, | Yihong Wu, |     |     |     |     |     |
| ----------- | ------ | ---- | ----- | ---- | ---------- | --- | --- | --- | --- | --- |
Kaiyu Huang, and Jian-Yun Nie. 2023. Convgqr: ShuzhengSi,ShuangZeng,andBaobaoChang.2022.
|            |       |               |     |                    |     | Mining clues | from | incomplete | utterance: | A query- |
| ---------- | ----- | ------------- | --- | ------------------ | --- | ------------ | ---- | ---------- | ---------- | -------- |
| Generative | query | reformulation |     | for conversational |     |              |      |            |            |          |
enhancednetworkforincompleteutterancerewriting.
| search. | InProceedingsofthe61stAnnualMeetingof |     |     |     |     |     |     |     |     |     |
| ------- | ------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
InProceedingsofthe2022ConferenceoftheNorth
theAssociationforComputationalLinguistics(Vol-
ume1: LongPapers),ACL2023,Toronto,Canada, AmericanChapteroftheAssociationforComputa-
July9-14,2023,pages4998–5012.Associationfor tionalLinguistics: HumanLanguageTechnologies,
NAACL2022,Seattle,WA,UnitedStates,July10-15,
ComputationalLinguistics.
2022,pages4839–4847.AssociationforComputa-
tionalLinguistics.
AkashKumarMohankumar,BhargavDodla,GururajK,
| andAmitSingh.2023. |     |     | Unifiedgenerative&dense |     |     |     |     |     |     |     |
| ------------------ | --- | --- | ----------------------- | --- | --- | --- | --- | --- | --- | --- |
retrievalforqueryrewritinginsponsoredsearch. In HuiSu,XiaoyuShen,RongzhiZhang,FeiSun,Peng-
Proceedingsofthe32ndACMInternationalConfer- weiHu,ChengNiu,andJieZhou.2019. Improving
ence on Information and Knowledge Management, multi-turndialoguemodellingwithutterancerewriter.
InProceedingsofthe57thConferenceoftheAssoci-
CIKM2023,Birmingham,UnitedKingdom,October
21-25,2023,pages4745–4751.ACM. ationforComputationalLinguistics,ACL2019,Flo-
|     |     |     |     |     |     | rence,Italy,July28-August2,2019,Volume1: |     |     |     | Long |
| --- | --- | --- | --- | --- | --- | ---------------------------------------- | --- | --- | --- | ---- |
OpenAI. 2023. GPT-4 technical report. CoRR, Papers,pages22–31.AssociationforComputational
| abs/2303.08774. |     |     |     |     |     | Linguistics. |     |     |     |     |
| --------------- | --- | --- | --- | --- | --- | ------------ | --- | --- | --- | --- |
2147

| Svitlana Vakulenko,      | Shayne   | Longpre,             | Zhucheng Tu,  |
| ------------------------ | -------- | -------------------- | ------------- |
| andRavitejaAnantha.2021. |          | Questionrewritingfor |               |
| conversational           | question | answering.           | In WSDM ’21,  |
| The Fourteenth           | ACM      | International        | Conference on |
WebSearchandDataMining,VirtualEvent,Israel,
March8-12,2021,pages355–363.ACM.
KunXu,HaochenTan,LinfengSong,HanWu,Haisong
| Zhang,LinqiSong,andDongYu.2020. |     |     | Semantic |
| ------------------------------- | --- | --- | -------- |
rolelabelingguidedmulti-turndialoguerewriter. In
| Proceedings | of the 2020 | Conference | on Empirical |
| ----------- | ----------- | ---------- | ------------ |
MethodsinNaturalLanguageProcessing,EMNLP
2020,Online,November16-20,2020,pages6632–
6639.AssociationforComputationalLinguistics.
2148